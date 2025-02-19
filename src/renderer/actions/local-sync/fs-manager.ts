import { type Static } from "@sinclair/typebox";

import fs from "node:fs";
import fsp from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";
import {
  appendPath,
  createFsResource,
  getIdFromPath,
  getNormalizedPath,
  mapSuccessfulFsResult,
  mapSuccessWrite,
  parseContent,
  removeUndefinedFromRoot,
} from "./common-utils";
import { CONFIG_FILE, ENVIRONMENT_VARIABLES_FOLDER } from "./constants";
import {
  createFolder,
  parseFile,
  parseFileResultToApi,
  parseFileToApi,
  parseFolderToCollection,
  sanitizeFsResourceList,
  writeContent,
} from "./fs-utils";
import { ApiRecord, Config, EnvironmentRecord } from "./schemas";
import {
  API,
  APIEntity,
  Collection,
  Environment,
  FileSystemResult,
  FsResource,
} from "./types";

export class FsManager {
  private rootPath: string;

  private config: Static<typeof Config>;

  constructor(rootPath: string) {
    this.rootPath = getNormalizedPath(rootPath);
    this.config = this.parseConfig();
  }

  private parseConfig() {
    const configFile = this.createResource({
      id: getIdFromPath(appendPath(this.rootPath, CONFIG_FILE)),
      type: "file",
    });
    const rawConfig = fs.readFileSync(configFile.path).toString();
    const parsedConfig = parseContent(rawConfig, Config);
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

  private async parseFolder(rootPath: string, type: APIEntity["type"]) {
    const container: FsResource[] = [];
    const recursiveParser = async (path: string) => {
      const children = await fsp.readdir(path);
      // eslint-disable-next-line
      for (const child of children) {
        const resourcePath = appendPath(path, child);
        const resourceMetadata = await fsp.stat(resourcePath);

        if (resourceMetadata.isDirectory()) {
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
    };

    await recursiveParser(rootPath);
    return sanitizeFsResourceList(rootPath, container, type);
  }

  // eslint-disable-next-line
  private generateFileName() {
    return `${uuidv4()}.json`;
  }

  async getRecord(id: string): Promise<FileSystemResult<API>> {
    const resource = this.createResource({
      id,
      type: "file",
    });
    const fileResult = await parseFile({
      resource,
      validator: ApiRecord,
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

  async getAllRecords(): Promise<FileSystemResult<APIEntity[]>> {
    const resourceContainer = await this.parseFolder(this.rootPath, "api");
    console.log({ resourceContainerr: resourceContainer });
    const entities: APIEntity[] = [];
    // eslint-disable-next-line
    for (const resource of resourceContainer) {
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
          const envFolder = appendPath(
            this.rootPath,
            ENVIRONMENT_VARIABLES_FOLDER
          );
          if (resource.path === envFolder) {
            // eslint-disable-next-line consistent-return
            return;
          }
          const configFile = appendPath(this.rootPath, CONFIG_FILE);
          if (resource.path === configFile) {
            // eslint-disable-next-line consistent-return
            return;
          }
          return parseFileToApi(this.rootPath, resource).then((result) =>
            mapSuccessfulFsResult(
              result,
              (successfulResult) => successfulResult.content
            )
          );
        })();

      if (entityParsingResult?.type === "error") {
        return entityParsingResult;
      }

      if (entityParsingResult) {
        entities.push(entityParsingResult.content);
      }
    }

    return {
      type: "success",
      content: entities,
    };
  }

  async getAllEnvironments(): Promise<FileSystemResult<APIEntity[]>> {
    const resourceContainer = await this.parseFolder(
      this.rootPath,
      "environment"
    );
    const entities: Environment[] = [];
    // eslint-disable-next-line
    for (const resource of resourceContainer) {
      if (resource.type === "file") {
        const parsedResult = await parseFile({
          resource,
          validator: EnvironmentRecord,
        });
        if (parsedResult.type === "error") {
          return parsedResult;
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
      content: entities,
    };
  }

  async createRecord(
    content: Static<typeof ApiRecord>,
    collectionId?: string
  ): Promise<FileSystemResult<API>> {
    try {
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
      const writeResult = await writeContent(resource, content);
      if (writeResult.type === "error") {
        return writeResult;
      }

      return parseFileToApi(this.rootPath, resource);
    } catch (e: any) {
      return {
        type: "error",
        error: {
          message: e.message || "An unexpected error has occured!",
        },
      };
    }
  }

  async createRecordWithId(
    content: Static<typeof ApiRecord>,
    id: string
  ): Promise<FileSystemResult<API>> {
    try {
      const resource = createFsResource({
        rootPath: this.rootPath,
        path: id,
        type: "file",
      });
      const writeResult = await writeContent(resource, content);
      if (writeResult.type === "error") {
        return writeResult;
      }

      return parseFileToApi(this.rootPath, resource);
    } catch (e: any) {
      return {
        type: "error",
        error: {
          message: e.message || "An unexpected error has occured!",
        },
      };
    }
  }

  async createCollection(
    name: string,
    collectionId?: string
  ): Promise<FileSystemResult<Collection>> {
    try {
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
      const createResult = await createFolder(resource);
      if (createResult.type === "error") {
        return createResult;
      }

      return parseFolderToCollection(this.rootPath, resource);
    } catch (e: any) {
      return {
        type: "error",
        error: {
          message: e.message || "An unexpected error has occured!",
        },
      };
    }
  }

  async updateRecord(
    patch: Partial<Static<typeof ApiRecord>>,
    id: string
  ): Promise<FileSystemResult<API>> {
    try {
      removeUndefinedFromRoot(patch);
      const fileResource = this.createResource({
        id,
        type: "file",
      });
      const parsedRecordResult = await parseFile({
        resource: fileResource,
        validator: ApiRecord,
      });

      if (parsedRecordResult.type === "error") {
        return parsedRecordResult;
      }
      const { content: currentRecord } = parsedRecordResult;
      const updatedRecord: Static<typeof ApiRecord> = {
        ...currentRecord,
        ...patch,
      };
      const writeResult = await writeContent(fileResource, updatedRecord);
      if (writeResult.type === "error") {
        return writeResult;
      }

      return parseFileToApi(this.rootPath, fileResource);
    } catch (e: any) {
      return {
        type: "error",
        error: {
          message: e.message || "An unexpected error has occured!",
        },
      };
    }
  }
}
