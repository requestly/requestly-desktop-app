import { safeStorage } from "electron";
import { AbstractEncryptedStorage } from "./AbstractEncryptedStorage";
import {
  GLOBAL_CONFIG_FILE_NAME,
  GLOBAL_CONFIG_FOLDER_PATH,
} from "../../../renderer/actions/local-sync/constants";
import {
  appendPath,
  createFsResource,
} from "../../../renderer/actions/local-sync/common-utils";
import {
  createGlobalConfigFolder,
  getIfFileExists,
  getIfFolderExists,
} from "../../../renderer/actions/local-sync/fs-utils";

export class EncryptedFsStorageService extends AbstractEncryptedStorage {
  constructor(private readonly baseFolderPath: string) {
    super();
  }

  async initialize(): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      // Show trouble shooting steps to user
      throw new Error("Encryption is not available on this system. ");
    }

    const globalConfigFolderResource = createFsResource({
      rootPath: GLOBAL_CONFIG_FOLDER_PATH,
      path: GLOBAL_CONFIG_FOLDER_PATH,
      type: "folder",
    });
    const globalConfigFolderExists = await getIfFolderExists(
      globalConfigFolderResource
    );

    if (!globalConfigFolderExists) {
      await createGlobalConfigFolder();
    }

    const globalConfigFileResource = createFsResource({
      rootPath: GLOBAL_CONFIG_FOLDER_PATH,
      path: appendPath(GLOBAL_CONFIG_FOLDER_PATH, GLOBAL_CONFIG_FILE_NAME),
      type: "file",
    });

    const globalConfigFileExists = await getIfFileExists(
      globalConfigFileResource
    );

    // initialize directories
  }

  async save<T extends Record<string, any>>(
    key: string,
    data: T
  ): Promise<void> {
    // encrypted
  }

  async load<T extends Record<string, any>>(key: string): Promise<T> {}

  async delete(key: string): Promise<void> {}
}
