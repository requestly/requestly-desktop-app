import fsp from "node:fs/promises";
import {
  API,
  Collection,
  FileResource,
  FileSystemResult,
  FolderResource,
  FsResource,
} from "./types";
import { appendPath, createFsResource, getIdFromPath, getNameOfResource, getNormalizedPath, parseContent } from "./common-utils";
import { COLLECTION_VARIABLES_FILE } from "./constants";
import { Static, TSchema } from "@sinclair/typebox";
import { ApiRecord, Variables } from "./schemas";

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

export function serializeContentForWriting(content: Record<any, any>) {
  return JSON.stringify(content, null, 2);
}

export async function writeContent(
  resource: FileResource,
  content: Record<any, any>
): Promise<FileSystemResult<{ resource: FileResource }>> {
  try {
    const serializedContent = serializeContentForWriting(content);
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
    }
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
  const [rawParent] = path.split(normalizedName);
  if (rawParent === rootPath) {
    return "";
  }
  return rawParent;
}

export async function parseFolderToCollection(
  rootPath: string,
  folder: FolderResource
): Promise<FileSystemResult<{ collection: Collection }>> {
  const varsPath = appendPath(folder.path, COLLECTION_VARIABLES_FILE);
  const fileStats = await fsp.lstat(varsPath);
  const collectionVariablesExist = fileStats.isFile();

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

  const result: FileSystemResult<{ collection: Collection }> = {
    type: "success",
    content: {
      collection,
    },
  };

  return result;
}

export async function parseFileToApi(
  rootPath: string,
  file: FileResource
): Promise<FileSystemResult<{ api: API }>> {
  const parsedFileResult = await parseFile({
    resource: file,
    validator: ApiRecord,
  });

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

  const result: FileSystemResult<{ api: API }> = {
    type: "success",
    content: {
      api,
    },
  };

  return result;
}
