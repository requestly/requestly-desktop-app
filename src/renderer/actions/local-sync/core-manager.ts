import { createFolder, createWorkspaceFolder, getAllWorkspaces, getIfFolderExists } from "./fs-utils";
import { APIFsManager } from "./api-fs-manager";
import { appendPath, createFsResource } from "./common-utils";
import { FileSystemError } from "./types";

export class CoreManager {
  static async createWorkspaceFolder(name: string, workspacePath: string) {
    const result = await createWorkspaceFolder(name, workspacePath);
    if (result.type === 'error') {
      return result;
    }
    const error = await CoreManager.postWorkspaceCreationSteps(workspacePath);
    if (error) {
      return error;
    }

    return result;
  }

  static async getAllWorkspaces() {
    return getAllWorkspaces();
  }

  private static async postWorkspaceCreationSteps(workspacePath: string) {
    const result = await this.createApisFolder(workspacePath);
    return result;
  }

  static async createApisFolder(workspacePath: string): Promise<FileSystemError | undefined> {
    const folder = createFsResource({
      rootPath: workspacePath,
      path: appendPath(workspacePath, APIFsManager.homeFolder),
      type: 'folder',
    })
    const result = await getIfFolderExists(folder);
    if (result) {
      return;
    }

    const creationResult = await createFolder(folder);
    if (creationResult.type === 'success') {
      return;
    }

    // eslint-disable-next-line consistent-return
    return creationResult;
  }
}
