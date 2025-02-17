import fsp from "node:fs/promises";
import { FileResource, FileSystemResult, FolderResource, FsResource } from "./types";
import { appendPath, createFsResource } from "./common-utils";

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
