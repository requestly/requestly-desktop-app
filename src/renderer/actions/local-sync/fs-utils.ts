import fsp from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";
import {
  API,
  APIEntity,
  Collection,
  Environment,
  EnvironmentVariableValue,
  FileResource,
  FileSystemResult,
  FileType,
  FolderResource,
  FsResource,
} from "./types";
import {
  appendPath,
  createFsResource,
  getIdFromPath,
  getNameOfResource,
  getNormalizedPath,
  parseContent,
} from "./common-utils";
import {
  COLLECTION_AUTH_FILE,
  COLLECTION_VARIABLES_FILE,
  CONFIG_FILE,
  CURRENT_CONFIG_FILE_VERSION,
  DESCRIPTION_FILE,
  DS_STORE_FILE,
  ENVIRONMENT_VARIABLES_FOLDER,
  fileTypeToValidator,
  GLOBAL_CONFIG_FILE_NAME,
  GLOBAL_CONFIG_FOLDER_PATH,
} from "./constants";
import { Static, TSchema } from "@sinclair/typebox";
import {
  ApiMethods,
  ApiRecord,
  Config,
  EnvironmentRecord,
  Variables,
  EnvironmentVariableType,
  GlobalConfig,
  Description,
  Auth,
} from "./schemas";
import { Stats } from "node:fs";

export async function getFsResourceStats(
  resource: FsResource
): Promise<FileSystemResult<Stats>> {
  try {
    const pathStats = await fsp.lstat(resource.path);
    return {
      type: "success",
      content: pathStats,
    };
  } catch (e: any) {
    return {
      type: "error",
      error: {
        message: e.message || "An unexpected error has occured!",
        path: resource.path,
        fileType: "unknown" as FileType,
      },
    };
  }
}

export function getFileTypeFromValidator(validator: TSchema): FileType {
  return Object.keys(fileTypeToValidator).find(
    (key) => fileTypeToValidator[key as FileType] === validator
  ) as FileType;
}

export async function getIfFolderExists(resource: FolderResource) {
  const statsResult = await getFsResourceStats(resource);
  const doesFolderExist =
    statsResult.type === "error" ? false : statsResult.content.isDirectory();
  return doesFolderExist;
}

export async function getIfFileExists(resource: FileResource) {
  const statsResult = await getFsResourceStats(resource);
  const doesFileExist =
    statsResult.type === "error" ? false : statsResult.content.isFile();
  return doesFileExist;
}

export async function deleteFsResource(
  resource: FsResource
): Promise<FileSystemResult<{ resource: FsResource }>> {
  try {
    if (resource.type === "file") {
      const exists = await getIfFileExists(resource);
      if (!exists) {
        return {
          type: "success",
          content: {
            resource,
          },
        };
      }
      await fsp.unlink(resource.path);
    } else {
      const exists = await getIfFolderExists(resource);
      if (!exists) {
        return {
          type: "success",
          content: {
            resource,
          },
        };
      }
      await fsp.rmdir(resource.path, { recursive: true });
    }
    return {
      type: "success",
      content: {
        resource,
      },
    };
  } catch (e: any) {
    return {
      type: "error",
      error: {
        message: e.message || "An unexpected error has occured!",
        path: resource.path,
        fileType: "unknown" as FileType,
      },
    };
  }
}

export async function createFolder(
  resource: FolderResource,
  errorIfDoesNotExist = false
): Promise<FileSystemResult<{ resource: FolderResource }>> {
  try {
    const statsResult = await getFsResourceStats(resource);
    const doesFolderExist =
      statsResult.type === "error" ? false : statsResult.content.isDirectory();

    if (!doesFolderExist) {
      await fsp.mkdir(resource.path, { recursive: true });
    } else if (errorIfDoesNotExist) {
      return {
        type: "error",
        error: {
          message: "Folder already exists!",
          path: resource.path,
          fileType: "unknown" as FileType,
        },
      };
    }
    return {
      type: "success",
      content: {
        resource,
      },
    };
  } catch (e: any) {
    return {
      type: "error",
      error: {
        message: e.message || "An unexpected error has occured!",
        path: resource.path,
        fileType: "unknown" as FileType,
      },
    };
  }
}

export async function rename<T extends FsResource>(
  oldResource: T,
  newResource: T
): Promise<FileSystemResult<T>> {
  try {
    await fsp.rename(oldResource.path, newResource.path);
    return {
      type: "success",
      content: newResource,
    } as FileSystemResult<T>;
  } catch (e: any) {
    return {
      type: "error",
      error: {
        message: e.message || "An unexpected error has occured!",
        path: oldResource.path,
        fileType: "unknown" as FileType,
      },
    };
  }
}

export async function copyRecursive<T extends FsResource>(
  sourceResource: T,
  destinationResource: T
): Promise<FileSystemResult<T>> {
  try {
    await fsp.cp(sourceResource.path, destinationResource.path, {
      recursive: true,
    });
    return {
      type: "success",
      content: destinationResource,
    } as FileSystemResult<T>;
  } catch (e: any) {
    return {
      type: "error",
      error: {
        message: e.message || "An unexpected error has occured!",
        path: sourceResource.path,
        fileType: "unknown" as FileType,
      },
    };
  }
}

export function serializeContentForWriting(content: string | Record<any, any>) {
  if (typeof content === "string") {
    return content;
  }
  return JSON.stringify(content, null, 2);
}

export async function writeContent<T extends TSchema>(
  resource: FileResource,
  content: string | Record<any, any>,
  validator: T,
  parseAsJson = true
): Promise<FileSystemResult<{ resource: FileResource }>> {
  try {
    const serializedContent = serializeContentForWriting(content);
    if (parseAsJson) {
      const parsedContentResult = parseContent(serializedContent, validator);
      if (parsedContentResult.type === "error") {
        return {
          type: "error",
          error: {
            message: parsedContentResult.error.message,
            path: resource.path,
            fileType: getFileTypeFromValidator(validator),
          },
        };
      }
    }

    console.log("writing at", resource.path);
    await fsp.writeFile(resource.path, serializedContent);
    return {
      type: "success",
      content: {
        resource,
      },
    };
  } catch (e: any) {
    return {
      type: "error",
      error: {
        message: e.message || "An unexpected error has occurred!",
        path: resource.path,
        fileType: getFileTypeFromValidator(validator),
      },
    };
  }
}

export async function parseFile<T extends TSchema>(params: {
  resource: FileResource;
  validator?: T;
  parseAsJson?: boolean;
}): Promise<FileSystemResult<Static<T>>> {
  const { resource, validator, parseAsJson = true } = params;
  try {
    const content = (await fsp.readFile(resource.path)).toString();
    if (!parseAsJson) {
      return {
        type: "success",
        content,
      } as FileSystemResult<Static<T>>;
    }

    if (validator) {
      const parsedContentResult = parseContent(content, validator);
      if (parsedContentResult.type === "error") {
        return {
          type: "error",
          error: {
            message: parsedContentResult.error.message,
            path: resource.path,
            fileType: getFileTypeFromValidator(validator),
          },
        };
      }
      return parsedContentResult;
    }

    return {
      type: "success",
      content: JSON.parse(content),
    } as FileSystemResult<Static<T>>;
  } catch (e: any) {
    return {
      type: "error",
      error: {
        message: e.message || "An unexpected error has occurred!",
        path: resource.path,
        fileType: "unknown" as FileType,
      },
    };
  }
}

export async function createGlobalConfigFolder(): Promise<
  FileSystemResult<{ resource: FolderResource }>
> {
  try {
    return await createFolder(
      createFsResource({
        rootPath: GLOBAL_CONFIG_FOLDER_PATH,
        path: GLOBAL_CONFIG_FOLDER_PATH,
        type: "folder",
      })
    );
  } catch (e: any) {
    return {
      type: "error",
      error: {
        message: e.message || "An unexpected error has occured!",
        path: GLOBAL_CONFIG_FOLDER_PATH,
        fileType: "unknown" as FileType,
      },
    };
  }
}

export async function addWorkspaceToGlobalConfig(params: {
  name: string;
  path: string;
}): Promise<FileSystemResult<{ name: string; id: string; path: string }>> {
  const { name, path } = params;
  const globalConfigFolderResource = createFsResource({
    rootPath: GLOBAL_CONFIG_FOLDER_PATH,
    path: GLOBAL_CONFIG_FOLDER_PATH,
    type: "folder",
  });
  const globalConfigFolderExists = await getIfFolderExists(
    globalConfigFolderResource
  );
  if (!globalConfigFolderExists) {
    const result = await createGlobalConfigFolder();
    if (result.type === "error") {
      return result;
    }
  }

  const globalConfigFileResource = createFsResource({
    rootPath: GLOBAL_CONFIG_FOLDER_PATH,
    path: appendPath(GLOBAL_CONFIG_FOLDER_PATH, GLOBAL_CONFIG_FILE_NAME),
    type: "file",
  });
  const newWorkspace = {
    id: uuidv4(),
    name,
    path,
  };
  const globalConfigFileExists = await getIfFileExists(
    globalConfigFileResource
  );
  if (!globalConfigFileExists) {
    const config: Static<typeof GlobalConfig> = {
      version: CURRENT_CONFIG_FILE_VERSION,
      workspaces: [newWorkspace],
    };
    const result = await writeContent(
      globalConfigFileResource,
      config,
      GlobalConfig
    );
    if (result.type === "error") {
      return result;
    }
    return {
      type: "success",
      content: newWorkspace,
    };
  }

  const readResult = await parseFile({
    resource: globalConfigFileResource,
    validator: GlobalConfig,
  });

  if (readResult.type === "error") {
    return readResult;
  }

  const updatedConfig = {
    version: readResult.content.version,
    workspaces: [...readResult.content.workspaces, newWorkspace],
  };

  const writeResult = await writeContent(
    globalConfigFileResource,
    updatedConfig,
    GlobalConfig
  );
  if (writeResult.type === "error") {
    return writeResult;
  }

  return {
    type: "success",
    content: newWorkspace,
  };
}

export async function createWorkspaceFolder(
  name: string,
  path: string
): Promise<FileSystemResult<{ name: string; id: string; path: string }>> {
  console.log("createWorkspaceFolder called", name, path);
  const folderCreationResult = await createFolder(
    createFsResource({
      rootPath: path,
      path,
      type: "folder",
    })
  );

  if (folderCreationResult.type === "error") {
    return folderCreationResult;
  }
  const configFileCreationResult = await writeContent(
    createFsResource({
      rootPath: path,
      path: appendPath(path, "requestly.json"),
      type: "file",
    }),
    {
      version: "0.0.1",
    },
    Config
  );
  if (configFileCreationResult.type === "error") {
    return configFileCreationResult;
  }

  return addWorkspaceToGlobalConfig({
    name,
    path,
  });
}

export async function migrateGlobalConfig(oldConfig: any) {
  if (!oldConfig.version) {
    return {
      version: CURRENT_CONFIG_FILE_VERSION,
      workspaces: oldConfig,
    };
  }

  return oldConfig;
}

export async function getAllWorkspaces(): Promise<
  FileSystemResult<Static<typeof GlobalConfig>["workspaces"]>
> {
  console.log("getAllWorkspaces called");
  const globalConfigFileResource = createFsResource({
    rootPath: GLOBAL_CONFIG_FOLDER_PATH,
    path: appendPath(GLOBAL_CONFIG_FOLDER_PATH, GLOBAL_CONFIG_FILE_NAME),
    type: "file",
  });

  const readResult = await parseFile({
    resource: globalConfigFileResource,
  });

  if (readResult.type === "error") {
    return readResult;
  }
  // @ts-ignore
  if (readResult.content.version !== CURRENT_CONFIG_FILE_VERSION) {
    const migratedConfig = await migrateGlobalConfig(readResult.content);
    const writeResult = await writeContent(
      globalConfigFileResource,
      migratedConfig,
      GlobalConfig
    );
    if (writeResult.type === "error") {
      return writeResult;
    }

    return {
      type: "success",
      content: migratedConfig.workspaces,
    };
  }

  // @ts-ignore
  return readResult.content.workspaces as FileSystemResult<
    Static<typeof GlobalConfig>["workspaces"]
  >;
}

export function getParentFolderPath(fsResource: FsResource) {
  const { path } = fsResource;
  const name = getNameOfResource(fsResource);
  const normalizedName =
    fsResource.type === "folder" ? getNormalizedPath(name) : name;
  const [rawParent] = path.split(`/${normalizedName}`);
  const parent = getNormalizedPath(rawParent);
  return parent;
}

function getCollectionId(rootPath: string, fsResource: FsResource) {
  const parentPath = getParentFolderPath(fsResource);
  if (parentPath === rootPath) {
    return getIdFromPath("");
  }

  return getIdFromPath(parentPath);
}

async function getCollectionVariables(
  rootPath: string,
  folder: FolderResource
): Promise<FileSystemResult<Static<typeof Variables>>> {
  const varsPath = appendPath(folder.path, COLLECTION_VARIABLES_FILE);
  const collectionVariablesExist = await fsp
    .lstat(varsPath)
    .then((stats) => stats.isFile())
    .catch(() => false);

  if (collectionVariablesExist) {
    return parseFile({
      resource: createFsResource({
        rootPath,
        path: varsPath,
        type: "file",
      }),
      validator: Variables,
    });
  }

  return {
    type: "success",
    content: {},
  } as FileSystemResult<Static<typeof Variables>>;
}

async function getCollectionDescription(
  rootPath: string,
  folder: FolderResource
): Promise<FileSystemResult<string>> {
  const descriptionPath = appendPath(folder.path, DESCRIPTION_FILE);
  const descriptionFileExists = await fsp
    .lstat(descriptionPath)
    .then((stats) => stats.isFile())
    .catch(() => false);

  if (descriptionFileExists) {
    return parseFile({
      resource: createFsResource({
        rootPath,
        path: descriptionPath,
        type: "file",
      }),
      validator: Description,
      parseAsJson: false,
    });
  }

  return {
    type: "success",
    content: "",
  };
}

async function getCollectionAuthData(
  rootPath: string,
  folder: FolderResource
): Promise<FileSystemResult<Static<typeof Auth>>> {
  const authPath = appendPath(folder.path, COLLECTION_AUTH_FILE);
  const authFileExists = await fsp
    .lstat(authPath)
    .then((stats) => stats.isFile())
    .catch(() => false);

  if (authFileExists) {
    return parseFile({
      resource: createFsResource({
        rootPath,
        path: authPath,
        type: "file",
      }),
      validator: Auth,
    });
  }

  return {
    type: "success",
    content: {},
  } as FileSystemResult<Static<typeof Auth>>;
}

export async function parseFolderToCollection(
  rootPath: string,
  folder: FolderResource
): Promise<FileSystemResult<Collection>> {
  const collectionVariablesResult = await getCollectionVariables(
    rootPath,
    folder
  );
  if (collectionVariablesResult.type === "error") {
    return collectionVariablesResult;
  }

  const descriptionFileResult = await getCollectionDescription(
    rootPath,
    folder
  );
  if (descriptionFileResult.type === "error") {
    return descriptionFileResult;
  }

  const collectionAuthDataResult = await getCollectionAuthData(
    rootPath,
    folder
  );
  if (collectionAuthDataResult.type === "error") {
    return collectionAuthDataResult;
  }

  const collectionVariables = collectionVariablesResult.content;
  const collectionAuthData = collectionAuthDataResult.content;
  const collectionDescription = descriptionFileResult.content;

  const collection: Collection = {
    type: "collection",
    id: getIdFromPath(folder.path),
    name: getNameOfResource(folder),
    collectionId: getCollectionId(rootPath, folder),
    variables: collectionVariables,
    description: collectionDescription,
    auth: collectionAuthData,
  };

  const result: FileSystemResult<Collection> = {
    type: "success",
    content: collection,
  };

  return result;
}

export function parseFileResultToApi(
  rootPath: string,
  file: FileResource,
  parsedFileResult: FileSystemResult<{
    name: string;
    url: string;
    method: ApiMethods;
  }>
) {
  if (parsedFileResult.type === "error") {
    return parsedFileResult;
  }

  const { content: record } = parsedFileResult;
  const api: API = {
    type: "api",
    collectionId: getCollectionId(rootPath, file),
    id: getIdFromPath(file.path),
    request: record,
  };

  const result: FileSystemResult<API> = {
    type: "success",
    content: api,
  };

  return result;
}

export async function parseFileToApi(
  rootPath: string,
  file: FileResource
): Promise<FileSystemResult<API>> {
  const parsedFileResult = await parseFile({
    resource: file,
    validator: ApiRecord,
  });

  return parseFileResultToApi(rootPath, file, parsedFileResult);
}

export function sanitizeFsResourceList(
  rootPath: string,
  resources: FsResource[],
  type: APIEntity["type"]
) {
  // eslint-disable-next-line no-unused-vars
  const checks: ((resource: FsResource) => boolean)[] = [
    (resource) => resource.path !== appendPath(rootPath, CONFIG_FILE),
    (resource) => !resource.path.endsWith(COLLECTION_VARIABLES_FILE),
    (resource) => !resource.path.endsWith(DESCRIPTION_FILE),
    (resource) => !resource.path.endsWith(COLLECTION_AUTH_FILE),
    (resource) => !resource.path.includes(DS_STORE_FILE),
  ];
  if (type === "api") {
    checks.push(
      (resource) =>
        !resource.path.startsWith(
          getNormalizedPath(appendPath(rootPath, ENVIRONMENT_VARIABLES_FOLDER))
        )
    );
  }
  if (type === "collection") {
    checks.push(
      (resource) =>
        !resource.path.startsWith(
          getNormalizedPath(appendPath(rootPath, ENVIRONMENT_VARIABLES_FOLDER))
        ),
      (resource) => resource.type === "folder"
    );
  }
  if (type === "environment") {
    checks.push((resource) =>
      resource.path.startsWith(
        getNormalizedPath(appendPath(rootPath, ENVIRONMENT_VARIABLES_FOLDER))
      )
    );
  }

  const predicate = (resource: FsResource) =>
    checks.every((check) => check(resource));

  return resources.filter(predicate);
}

export async function parseFileToEnv(
  file: FileResource
): Promise<FileSystemResult<Environment>> {
  const parsedFileResult = await parseFile({
    resource: file,
    validator: EnvironmentRecord,
  });

  if (parsedFileResult.type === "error") {
    return parsedFileResult;
  }

  const { content } = parsedFileResult;

  const environment: Environment = {
    type: "environment",
    id: getIdFromPath(file.path),
    name: content.name,
    variables: content.variables,
  };

  const result: FileSystemResult<Environment> = {
    type: "success",
    content: environment,
  };

  return result;
}

export function parseToEnvironmentEntity(
  variables: Record<string, EnvironmentVariableValue>
) {
  const newVariables: Record<
    string,
    Static<(typeof EnvironmentRecord)["variables"]>
  > = {};
  // eslint-disable-next-line
  for (const key in variables) {
    newVariables[key] = {
      value: variables[key].syncValue,
      type:
        variables[key].type === EnvironmentVariableType.Secret
          ? EnvironmentVariableType.String
          : variables[key].type,
      id: variables[key].id,
      isSecret: variables[key].type === EnvironmentVariableType.Secret,
    };
  }

  return newVariables;
}

export function getFileNameFromPath(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1];
}
