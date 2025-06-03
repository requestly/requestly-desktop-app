import { type Static } from "@sinclair/typebox";
import { v4 as uuidv4 } from "uuid";
import {
  appendPath,
  createFsResource,
  getIdFromPath,
  getNameOfResource,
  getNormalizedPath,
  mapSuccessfulFsResult,
  parseJsonContent,
  removeUndefinedFromRoot,
} from "./common-utils";
import {
  COLLECTION_AUTH_FILE,
  COLLECTION_VARIABLES_FILE,
  CONFIG_FILE,
  DESCRIPTION_FILE,
  ENVIRONMENT_VARIABLES_FOLDER,
  GLOBAL_ENV_FILE,
} from "./constants";
import {
  copyRecursive,
  createFolder,
  deleteFsResource,
  getFileNameFromPath,
  getParentFolderPath,
  parseFile,
  parseFileRaw,
  parseFileResultToApi,
  parseFileToApi,
  parseFileToEnv,
  parseFolderToCollection,
  parseToEnvironmentEntity,
  readdir,
  readFileSync,
  rename,
  sanitizeFsResourceList,
  stat,
  writeContent,
  writeContentRaw,
} from "./fs-utils";
import {
  ApiRecord,
  Auth,
  Config,
  EnvironmentRecord,
  AuthType,
} from "./schemas";
import {
  API,
  APIEntity,
  Collection,
  CollectionRecord,
  Environment,
  EnvironmentVariableValue,
  ErrorCode,
  ErroredRecord,
  FileSystemResult,
  FileTypeEnum,
  FsResource,
} from "./types";
import {
  ApiRecordFileType,
  AuthRecordFileType,
  CollectionVariablesRecordFileType,
  EnvironmentRecordFileType,
  parseFileType,
  ReadmeRecordFileType,
} from "./file-types/file-types";
import { isEmpty } from "lodash";
import { HandleError } from "./decorators/handle-error.decorator";
import { FsIgnoreManager } from "./fsIgnore-manager";

export class FsManager {
  private rootPath: string;

  private config: Static<typeof Config>;

  private fsIgnoreManager: FsIgnoreManager;

  constructor(rootPath: string) {
    this.rootPath = getNormalizedPath(rootPath);
    this.config = this.parseConfig();
    this.fsIgnoreManager = new FsIgnoreManager(this.rootPath, this.config);
  }

  reload() {
    this.config = this.parseConfig();
    this.fsIgnoreManager = new FsIgnoreManager(this.rootPath, this.config);
  }

  private parseConfig() {
    const configFile = this.createResource({
      id: getIdFromPath(appendPath(this.rootPath, CONFIG_FILE)),
      type: "file",
    });
    const rawConfig = readFileSync(configFile.path);
    if (rawConfig.type === "error") {
      throw new Error(
        `Could not load config from ${CONFIG_FILE}. ${rawConfig.error.message}`
      );
    }
    const parsedConfig = parseJsonContent(rawConfig.content, Config);
    if (parsedConfig.type === "error") {
      throw new Error(
        `Could not load config from ${CONFIG_FILE}. ${parsedConfig.error.message}`
      );
    }
    const { content: config } = parsedConfig;
    console.log(config);
    if (config.version !== "0.0.1") {
      throw new Error(`Unsupported version in ${CONFIG_FILE}!`);
    }
    return config;
  }

  private createResource<T extends FsResource["type"]>(params: {
    id: string;
    type: T;
  }) {
    return createFsResource({
      path: params.id,
      rootPath: this.rootPath,
      type: params.type,
    });
  }

  private async parseFolder(
    rootPath: string,
    type: APIEntity["type"]
  ): Promise<FileSystemResult<FsResource[]>> {
    const container: FsResource[] = [];
    const recursiveParser = async (path: string) => {
      const childrenResult = await readdir(path);
      if (childrenResult.type === "error") {
        return childrenResult;
      }
      // eslint-disable-next-line
      for (const child of childrenResult.content) {
        const resourcePath = appendPath(path, child);
        const resourceMetadataResult = await stat(resourcePath);
        if (resourceMetadataResult.type === "error") {
          return resourceMetadataResult;
        }

        if (resourceMetadataResult.content.isDirectory()) {
          container.push(
            this.createResource({
              id: getIdFromPath(resourcePath),
              type: "folder",
            })
          );
          await recursiveParser(resourcePath);
        } else {
          container.push(
            this.createResource({
              id: getIdFromPath(resourcePath),
              type: "file",
            })
          );
        }
      }
      return undefined;
    };

    const error = await recursiveParser(rootPath);
    if (error) {
      return error;
    }
    return {
      type: "success",
      content: sanitizeFsResourceList(
        rootPath,
        container,
        type,
        this.fsIgnoreManager
      ),
    };
  }

  // eslint-disable-next-line
  private generateFileName() {
    return `${uuidv4()}.json`;
  }

  private getEnvironmentsFolderPath() {
    const envFolderPath = appendPath(
      this.rootPath,
      ENVIRONMENT_VARIABLES_FOLDER
    );
    return envFolderPath;
  }

  @HandleError
  async getRecord(id: string): Promise<FileSystemResult<API>> {
    const resource = this.createResource({
      id,
      type: "file",
    });
    const fileResult = await parseFile({
      resource,
      fileType: new ApiRecordFileType(),
    });
    if (fileResult.type === "error") {
      return fileResult;
    }

    const parseResult = parseFileResultToApi(
      this.rootPath,
      resource,
      fileResult
    );
    return parseResult;
  }

  @HandleError
  async getCollection(id: string): Promise<FileSystemResult<Collection>> {
    const resource = this.createResource({
      id,
      type: "folder",
    });

    const parseResult = parseFolderToCollection(this.rootPath, resource);
    return parseResult;
  }

  @HandleError
  async getAllRecords(): Promise<
    FileSystemResult<{
      records: APIEntity[];
      erroredRecords: ErroredRecord[];
    }>
  > {
    const resourceContainerResult = await this.parseFolder(
      this.rootPath,
      "api"
    );
    if (resourceContainerResult.type === "error") {
      return resourceContainerResult;
    }
    const entities: APIEntity[] = [];
    const erroredRecords: ErroredRecord[] = [];
    // eslint-disable-next-line
    for (const resource of resourceContainerResult.content) {
      const entityParsingResult: FileSystemResult<APIEntity> | undefined =
        await (async () => {
          if (resource.type === "folder") {
            return parseFolderToCollection(this.rootPath, resource).then(
              (result) =>
                mapSuccessfulFsResult(
                  result,
                  (successfulResult) => successfulResult.content
                )
            );
          }
          return parseFileToApi(this.rootPath, resource).then((result) =>
            mapSuccessfulFsResult(
              result,
              (successfulResult) => successfulResult.content
            )
          );
        })();

      if (entityParsingResult?.type === "error") {
        erroredRecords.push({
          name: getFileNameFromPath(entityParsingResult.error.path),
          path: entityParsingResult.error.path,
          error: entityParsingResult.error.message,
          type: entityParsingResult.error.fileType,
        });
        // eslint-disable-next-line
        continue;
      }

      if (entityParsingResult) {
        entities.push(entityParsingResult.content);
      }
    }

    return {
      type: "success",
      content: {
        records: entities,
        erroredRecords,
      },
    };
  }

  @HandleError
  async getAllEnvironments(): Promise<
    FileSystemResult<{
      environments: Environment[];
      erroredRecords: ErroredRecord[];
    }>
  > {
    const fileType = new EnvironmentRecordFileType();
    const resourceContainerResult = await this.parseFolder(
      this.rootPath,
      "environment"
    );
    if (resourceContainerResult.type === "error") {
      return resourceContainerResult;
    }
    const entities: Environment[] = [];
    const erroredRecords: ErroredRecord[] = [];
    // eslint-disable-next-line
    for (const resource of resourceContainerResult.content) {
      if (resource.type === "file") {
        const parsedResult = await parseFile({
          resource,
          fileType,
        });
        if (parsedResult.type === "error") {
          erroredRecords.push({
            name: getNameOfResource(resource),
            path: parsedResult.error.path,
            error: parsedResult.error.message,
            type: fileType.type,
          });
          // eslint-disable-next-line
          continue;
        }
        if (parsedResult) {
          entities.push({
            type: "environment",
            id: getIdFromPath(resource.path),
            name: parsedResult.content.name,
            variables: parsedResult.content.variables,
          });
        }
      }
    }
    return {
      type: "success",
      content: {
        environments: entities,
        erroredRecords,
      },
    };
  }

  @HandleError
  async createRecord(
    content: Static<typeof ApiRecord>,
    collectionId?: string
  ): Promise<FileSystemResult<API>> {
    const folderResource = this.createResource({
      id: collectionId || getIdFromPath(this.rootPath),
      type: "folder",
    });

    const path = appendPath(folderResource.path, this.generateFileName());
    const resource = createFsResource({
      rootPath: this.rootPath,
      path,
      type: "file",
    });
    const writeResult = await writeContent(
      resource,
      content,
      new ApiRecordFileType()
    );
    if (writeResult.type === "error") {
      return writeResult;
    }

    return parseFileToApi(this.rootPath, resource);
  }

  @HandleError
  async createRecordWithId(
    content: Static<typeof ApiRecord>,
    id: string
  ): Promise<FileSystemResult<API>> {
    const resource = createFsResource({
      rootPath: this.rootPath,
      path: id,
      type: "file",
    });
    const writeResult = await writeContent(
      resource,
      content,
      new ApiRecordFileType()
    );
    if (writeResult.type === "error") {
      return writeResult;
    }

    return parseFileToApi(this.rootPath, resource);
  }

  @HandleError
  async deleteRecord(id: string): Promise<FileSystemResult<void>> {
    const resource = createFsResource({
      rootPath: this.rootPath,
      path: id,
      type: "file",
    });
    const deleteResult = await deleteFsResource(resource);
    if (deleteResult.type === "error") {
      return deleteResult;
    }

    return {
      type: "success",
    };
  }

  @HandleError
  async deleteRecords(ids: string[]): Promise<FileSystemResult<void>> {
    // eslint-disable-next-line no-restricted-syntax
    for (const id of ids) {
      const result = await this.deleteRecord(id);
      if (result.type === "error") {
        return result;
      }
    }

    return {
      type: "success",
    };
  }

  @HandleError
  async createCollection(
    name: string,
    collectionId?: string
  ): Promise<FileSystemResult<Collection>> {
    const folderResource = this.createResource({
      id: collectionId || getIdFromPath(this.rootPath),
      type: "folder",
    });
    const path = appendPath(folderResource.path, name);
    const resource = createFsResource({
      rootPath: this.rootPath,
      path,
      type: "folder",
    });
    const createResult = await createFolder(resource, {
      errorIfDoesNotExist: true,
    });
    if (createResult.type === "error") {
      return createResult;
    }
    return parseFolderToCollection(this.rootPath, resource);
  }

  @HandleError
  async createCollectionWithId(
    id: string
  ): Promise<FileSystemResult<Collection>> {
    const resource = createFsResource({
      rootPath: this.rootPath,
      path: id,
      type: "folder",
    });
    const createResult = await createFolder(resource);
    if (createResult.type === "error") {
      return createResult;
    }

    return parseFolderToCollection(this.rootPath, resource);
  }

  @HandleError
  async deleteCollection(id: string): Promise<FileSystemResult<void>> {
    const resource = createFsResource({
      rootPath: this.rootPath,
      path: id,
      type: "folder",
    });
    const deleteResult = await deleteFsResource(resource);
    if (deleteResult.type === "error") {
      return deleteResult;
    }

    return {
      type: "success",
    };
  }

  @HandleError
  async deleteCollections(ids: string[]): Promise<FileSystemResult<void>> {
    // eslint-disable-next-line no-restricted-syntax
    for (const id of ids) {
      const result = await this.deleteCollection(id);
      if (result.type === "error") {
        return result;
      }
    }

    return {
      type: "success",
    };
  }

  @HandleError
  async renameCollection(
    id: string,
    newName: string
  ): Promise<FileSystemResult<Collection>> {
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/g;
    if (specialCharRegex.test(newName)) {
      return {
        type: "error",
        error: {
          code: ErrorCode.WrongInput,
          message: "Collection name should not contain special characters.",
          path: id,
          fileType: FileTypeEnum.UNKNOWN,
        },
      };
    }
    const folderResource = this.createResource({
      id,
      type: "folder",
    });
    const parentPath = getParentFolderPath(folderResource);

    const newFolderResource = this.createResource({
      id: getIdFromPath(appendPath(parentPath, newName)),
      type: "folder",
    });

    const renameResult = await rename(folderResource, newFolderResource);
    if (renameResult.type === "error") {
      return renameResult;
    }

    return parseFolderToCollection(this.rootPath, renameResult.content);
  }

  @HandleError
  async updateCollectionDescription(
    id: string,
    description: string
  ): Promise<FileSystemResult<string>> {
    const descriptionFileResource = this.createResource({
      id: getIdFromPath(appendPath(id, DESCRIPTION_FILE)),
      type: "file",
    });
    if (!description.length) {
      const deleteResult = await deleteFsResource(descriptionFileResource);
      if (deleteResult.type === "error") {
        return deleteResult;
      }
      return {
        type: "success",
        content: "",
      };
    }

    const writeResult = await writeContent(
      descriptionFileResource,
      description,
      new ReadmeRecordFileType()
    );
    if (writeResult.type === "error") {
      return writeResult;
    }
    return {
      type: "success",
      content: description,
    };
  }

  @HandleError
  async updateCollectionAuthData(
    id: string,
    authData: Static<typeof Auth>
  ): Promise<FileSystemResult<Static<typeof Auth>>> {
    const authFileResource = this.createResource({
      id: getIdFromPath(appendPath(id, COLLECTION_AUTH_FILE)),
      type: "file",
    });

    if (authData.currentAuthType === AuthType.NO_AUTH) {
      const deleteResult = await deleteFsResource(authFileResource);
      if (deleteResult.type === "error") {
        return deleteResult;
      }
      return {
        type: "success",
        content: {
          authConfigStore: {},
          currentAuthType: AuthType.NO_AUTH,
        },
      };
    }
    const writeResult = await writeContent(
      authFileResource,
      authData,
      new AuthRecordFileType()
    );
    if (writeResult.type === "error") {
      return writeResult;
    }
    return {
      type: "success",
      content: authData,
    };
  }

  @HandleError
  async moveCollection(
    id: string,
    newParentId: string
  ): Promise<FileSystemResult<Collection>> {
    const parentPath = newParentId.length ? newParentId : this.rootPath;
    const folderResource = this.createResource({
      id,
      type: "folder",
    });
    const resourceName = getNameOfResource(folderResource);

    const newFolderResource = this.createResource({
      id: getIdFromPath(appendPath(parentPath, resourceName)),
      type: "folder",
    });

    const renameResult = await rename(folderResource, newFolderResource);
    if (renameResult.type === "error") {
      return renameResult;
    }

    return parseFolderToCollection(this.rootPath, renameResult.content);
  }

  @HandleError
  async moveCollections(
    ids: string[],
    newParentId: string
  ): Promise<FileSystemResult<Collection[]>> {
    const movedCollections: Collection[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const id of ids) {
      const result = await this.moveCollection(id, newParentId);
      if (result.type === "error") {
        return result;
      }
      movedCollections.push(result.content);
    }

    return {
      type: "success",
      content: movedCollections,
    };
  }

  @HandleError
  async moveRecord(
    id: string,
    newParentId: string
  ): Promise<FileSystemResult<API>> {
    const parentPath = newParentId.length ? newParentId : this.rootPath;
    const fileResource = this.createResource({
      id,
      type: "file",
    });
    const resourceName = getNameOfResource(fileResource);

    const newFileResource = this.createResource({
      id: getIdFromPath(appendPath(parentPath, resourceName)),
      type: "file",
    });

    const renameResult = await rename(fileResource, newFileResource);
    if (renameResult.type === "error") {
      return renameResult;
    }

    return parseFileToApi(this.rootPath, renameResult.content);
  }

  @HandleError
  async moveRecords(
    ids: string[],
    newParentId: string
  ): Promise<FileSystemResult<API[]>> {
    const movedRecords: API[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const id of ids) {
      const result = await this.moveRecord(id, newParentId);
      if (result.type === "error") {
        return result;
      }
      movedRecords.push(result.content);
    }

    return {
      type: "success",
      content: movedRecords,
    };
  }

  @HandleError
  async copyCollection(
    id: string,
    newId: string
  ): Promise<FileSystemResult<Collection>> {
    const sourceFolderResource = this.createResource({
      id,
      type: "folder",
    });

    const destinationFolderResource = this.createResource({
      id: newId,
      type: "folder",
    });

    const renameResult = await copyRecursive(
      sourceFolderResource,
      destinationFolderResource
    );
    if (renameResult.type === "error") {
      return renameResult;
    }

    return parseFolderToCollection(this.rootPath, renameResult.content);
  }

  @HandleError
  async setCollectionVariables(
    id: string,
    variables: Record<string, EnvironmentVariableValue>
  ): Promise<FileSystemResult<Collection>> {
    const folder = this.createResource({
      id,
      type: "folder",
    });
    const varsPath = appendPath(folder.path, COLLECTION_VARIABLES_FILE);
    const file = this.createResource({
      id: getIdFromPath(varsPath),
      type: "file",
    });

    if (!Object.keys(variables).length) {
      const deleteResult = await deleteFsResource(file);
      if (deleteResult.type === "error") {
        return deleteResult;
      }

      return parseFolderToCollection(this.rootPath, folder);
    }

    const parsedVariables = parseToEnvironmentEntity(variables);

    const writeResult = await writeContent(
      file,
      parsedVariables,
      new CollectionVariablesRecordFileType()
    );
    if (writeResult.type === "error") {
      return writeResult;
    }

    return parseFolderToCollection(this.rootPath, folder);
  }

  @HandleError
  async updateRecord(
    patch: Partial<Static<typeof ApiRecord>>,
    id: string
  ): Promise<FileSystemResult<API>> {
    const fileType = new ApiRecordFileType();
    removeUndefinedFromRoot(patch);
    const fileResource = this.createResource({
      id,
      type: "file",
    });
    const parsedRecordResult = await parseFile({
      resource: fileResource,
      fileType,
    });

    if (parsedRecordResult.type === "error") {
      return parsedRecordResult;
    }
    const { content: currentRecord } = parsedRecordResult;
    const updatedRecord: Static<typeof ApiRecord> = {
      ...currentRecord,
      ...patch,
    };
    const writeResult = await writeContent(
      fileResource,
      updatedRecord,
      fileType
    );
    if (writeResult.type === "error") {
      return writeResult;
    }

    return parseFileToApi(this.rootPath, fileResource);
  }

  @HandleError
  async writeRawRecord(
    id: string,
    rawRecord: string,
    rawfileType: string
  ): Promise<FileSystemResult<unknown>> {
    const fileResource = this.createResource({
      id,
      type: "file",
    });
    const fileType = parseFileType(rawfileType);
    const parsedRecord = fileType.parse(rawRecord);
    if (parsedRecord.type === "error") {
      return {
        type: "error",
        error: {
          code: ErrorCode.UNKNOWN,
          message: parsedRecord.error.message,
          path: fileResource.path,
          fileType: fileType.type,
        },
      };
    }

    const writeResult = await writeContentRaw(
      fileResource,
      parsedRecord.content
    );
    return writeResult;
  }

  @HandleError
  async createEnvironment(
    environmentName: string,
    isGlobal: boolean
  ): Promise<FileSystemResult<Environment>> {
    const environmentFolderPath = this.getEnvironmentsFolderPath();
    const environmentFolderResource = this.createResource({
      id: getIdFromPath(environmentFolderPath),
      type: "folder",
    });
    const folderCreationResult = await createFolder(environmentFolderResource);
    if (folderCreationResult.type === "error") {
      return folderCreationResult;
    }

    const envFile = this.createResource({
      id: appendPath(
        environmentFolderPath,
        isGlobal ? GLOBAL_ENV_FILE : this.generateFileName()
      ),
      type: "file",
    });
    const content = {
      name: environmentName,
      variables: {},
    };

    const writeResult = await writeContent(
      envFile,
      content,
      new EnvironmentRecordFileType()
    );
    if (writeResult.type === "error") {
      return writeResult;
    }
    return parseFileToEnv(envFile);
  }

  @HandleError
  async updateEnvironment(
    id: string,
    patch:
      | { name: string }
      | { variables: Record<string, EnvironmentVariableValue> }
  ): Promise<FileSystemResult<Environment>> {
    const fileType = new EnvironmentRecordFileType();
    removeUndefinedFromRoot(patch);
    const fileResource = this.createResource({
      id,
      type: "file",
    });
    const parsedRecordResult = await parseFile({
      resource: fileResource,
      fileType,
    });

    if (parsedRecordResult.type === "error") {
      return parsedRecordResult;
    }
    const { content } = parsedRecordResult;

    const updatedRecord: Static<typeof EnvironmentRecord> = {
      ...content,
    };

    if ("variables" in patch) {
      updatedRecord.variables = parseToEnvironmentEntity(patch.variables);
    }
    if ("name" in patch) {
      updatedRecord.name = patch.name;
    }

    const writeResult = await writeContent(
      fileResource,
      updatedRecord,
      fileType
    );
    if (writeResult.type === "error") {
      return writeResult;
    }

    return parseFileToEnv(fileResource);
  }

  @HandleError
  async copyEnvironment(
    id: string,
    newId: string
  ): Promise<FileSystemResult<Environment>> {
    const sourceFileResource = this.createResource({
      id,
      type: "file",
    });

    const destinationFileResource = this.createResource({
      id: newId,
      type: "file",
    });

    const result = await copyRecursive(
      sourceFileResource,
      destinationFileResource
    );
    if (result.type === "error") {
      return result;
    }

    return parseFileToEnv(result.content);
  }

  @HandleError
  async duplicateEnvironment(
    id: string
  ): Promise<FileSystemResult<Environment>> {
    const fileType = new EnvironmentRecordFileType();
    const fileResource = this.createResource({
      id,
      type: "file",
    });
    if (fileResource.path.endsWith(GLOBAL_ENV_FILE)) {
      return {
        type: "error",
        error: {
          code: ErrorCode.UNKNOWN,
          message: "Global environment cannnot be copied!",
          path: fileResource.path,
          fileType: FileTypeEnum.UNKNOWN,
        },
      };
    }
    const originalEnvironment = await parseFile({
      resource: fileResource,
      fileType,
    });

    if (originalEnvironment.type === "error") {
      return originalEnvironment;
    }

    const { content } = originalEnvironment;

    const newEnvironmentContent: Static<typeof EnvironmentRecord> = {
      name: `${content.name} (copy)`,
      variables: content.variables,
    };
    const path = appendPath(
      this.getEnvironmentsFolderPath(),
      this.generateFileName()
    );
    const resource = this.createResource({
      id: getIdFromPath(path),
      type: "file",
    });
    const writeResult = await writeContent(
      resource,
      newEnvironmentContent,
      fileType
    );
    if (writeResult.type === "error") {
      return writeResult;
    }

    return parseFileToEnv(resource);
  }

  @HandleError
  async getRawFileData(id: string): Promise<FileSystemResult<string>> {
    const fileResource = this.createResource({
      id,
      type: "file",
    });
    const parsedRecordResult = await parseFileRaw({
      resource: fileResource,
    });
    if (parsedRecordResult.type === "error") {
      return parsedRecordResult;
    }
    return parsedRecordResult;
  }

  @HandleError
  async createCollectionFromCompleteRecord(
    collection: CollectionRecord,
    id: string
  ): Promise<FileSystemResult<Collection>> {
    const collectionFolder = this.createResource({
      id,
      type: "folder",
    });
    const createResult = await createFolder(collectionFolder);
    if (createResult.type === "error") {
      return createResult;
    }

    if (collection.description?.length) {
      const descriptionFile = this.createResource({
        id: appendPath(collectionFolder.path, DESCRIPTION_FILE),
        type: "file",
      });
      const writeResult = await writeContent(
        descriptionFile,
        collection.description,
        new ReadmeRecordFileType()
      );
      if (writeResult.type === "error") {
        return writeResult;
      }
    }

    if (
      collection.data.auth &&
      !isEmpty(collection.data.auth) &&
      collection.data.auth.currentAuthType !== AuthType.NO_AUTH
    ) {
      const authFile = this.createResource({
        id: appendPath(collectionFolder.path, COLLECTION_AUTH_FILE),
        type: "file",
      });
      const writeResult = await writeContent(
        authFile,
        collection.data.auth,
        new AuthRecordFileType()
      );
      if (writeResult.type === "error") {
        return writeResult;
      }
    }

    if (!isEmpty(collection.data.variables)) {
      const variablesFile = this.createResource({
        id: appendPath(collectionFolder.path, COLLECTION_VARIABLES_FILE),
        type: "file",
      });
      const parsedVariables = parseToEnvironmentEntity(
        collection.data.variables
      );
      const writeResult = await writeContent(
        variablesFile,
        parsedVariables,
        new CollectionVariablesRecordFileType()
      );
      if (writeResult.type === "error") {
        return writeResult;
      }
    }

    return parseFolderToCollection(this.rootPath, collectionFolder);
  }
}
