import fsp from "node:fs/promises";
import {
  API,
  APIEntity,
  Collection,
  Environment,
  EnvironmentVariableType,
  EnvironmentVariableValue,
  FileResource,
  FileSystemResult,
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
  COLLECTION_VARIABLES_FILE,
  CONFIG_FILE,
  DS_STORE_FILE,
  ENVIRONMENT_VARIABLES_FOLDER,
} from "./constants";
import { Static, TSchema } from "@sinclair/typebox";
import {
  ApiMethods,
  ApiRecord,
  Config,
  EnvironmentRecord,
  Variables,
} from "./schemas";

export async function deleteFsResource(
  resource: FsResource
): Promise<FileSystemResult<{ resource: FsResource }>> {
  try {
    if (resource.type === "file") {
      await fsp.unlink(resource.path);
    } else {
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
      },
    };
  }
}

export async function createFolder(
  resource: FolderResource
): Promise<FileSystemResult<{ resource: FolderResource }>> {
  try {
    const pathStats = await fsp.lstat(resource.path);
    if (!pathStats.isDirectory()) {
      await fsp.mkdir(resource.path);
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
      },
    };
  }
}

export function serializeContentForWriting(content: Record<any, any>) {
  return JSON.stringify(content, null, 2);
}

export async function writeContent<T extends TSchema>(
  resource: FileResource,
  content: Record<any, any>,
  validator: T
): Promise<FileSystemResult<{ resource: FileResource }>> {
  try {
    const serializedContent = serializeContentForWriting(content);
    const parsedContentResult = parseContent(serializedContent, validator);
    if (parsedContentResult.type === "error") {
      return {
        type: "error",
        error: {
          message: parsedContentResult.error.message,
        },
      };
    }
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
        message: e.message || "An unexpected error has occured!",
      },
    };
  }
}

export async function createWorkspaceFolder(
  path: string
): Promise<FileSystemResult<void>> {
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
  return configFileCreationResult;
}

export async function parseFile<T extends TSchema>(params: {
  resource: FileResource;
  validator: T;
}): Promise<FileSystemResult<Static<T>>> {
  const { resource, validator } = params;
  try {
    const content = (await fsp.readFile(resource.path)).toString();
    const parsedContentResult = parseContent(content, validator);
    if (parsedContentResult.type === "error") {
      return {
        type: "error",
        error: {
          message: parsedContentResult.error.message,
        },
      };
    }

    return parsedContentResult;
  } catch (e: any) {
    return {
      type: "error",
      error: {
        message: e.message || "An unexpected error has occured!",
      },
    };
  }
}

// This will give an empty string if parent is root
export function getParentFoldePath(rootPath: string, fsResource: FsResource) {
  const { path } = fsResource;
  const name = getNameOfResource(fsResource);
  const normalizedName =
    fsResource.type === "folder" ? getNormalizedPath(name) : name;
  const [rawParent] = path.split(`/${normalizedName}`);
  const parent = getNormalizedPath(rawParent);
  if (parent === rootPath) {
    return "";
  }
  return parent;
}

export async function parseFolderToCollection(
  rootPath: string,
  folder: FolderResource
): Promise<FileSystemResult<Collection>> {
  const varsPath = appendPath(folder.path, COLLECTION_VARIABLES_FILE);
  const collectionVariablesExist = await fsp
    .lstat(varsPath)
    .then((stats) => stats.isFile())
    .catch(() => false);

  const collectionVariablesResult = await (async () => {
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
  })();

  if (collectionVariablesResult.type === "error") {
    return collectionVariablesResult;
  }

  const collectionVariables = collectionVariablesResult.content;

  const collection: Collection = {
    type: "collection",
    id: getIdFromPath(folder.path),
    name: getNameOfResource(folder),
    collectionId: getIdFromPath(getParentFoldePath(rootPath, folder)),
    variables: collectionVariables,
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
    collectionId: getIdFromPath(getParentFoldePath(rootPath, file)),
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
      value: variables[key].localValue,
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
