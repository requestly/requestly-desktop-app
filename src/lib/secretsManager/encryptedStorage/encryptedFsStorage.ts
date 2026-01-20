import { safeStorage } from "electron";
import { AbstractEncryptedStorage } from "./AbstractEncryptedStorage";
import {
  appendPath,
  createFsResource,
} from "../../../renderer/actions/local-sync/common-utils";
import {
  createFolder,
  deleteFsResource,
  getIfFolderExists,
  parseFileRaw,
  writeContentRaw,
} from "../../../renderer/actions/local-sync/fs-utils";

export class EncryptedFsStorage extends AbstractEncryptedStorage {
  private readonly baseFolderPath: string;

  constructor(baseFolderPath: string) {
    super();
    this.baseFolderPath = baseFolderPath;
  }

  async initialize(): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      // Show trouble shooting steps to user
      // Create a custom error for this
      throw new Error("Encryption is not available on this system. ");
    }

    if (!this.baseFolderPath) {
      throw new Error("Base folder path is not set for EncryptedFsStorage.");
    }
  }

  async save<T extends Record<string, any>>(
    key: string,
    data: T
  ): Promise<void> {
    const stringifiedData = JSON.stringify(data);
    const encryptedData = safeStorage.encryptString(stringifiedData);

    const fsFolderResource = createFsResource({
      rootPath: this.baseFolderPath,
      path: this.baseFolderPath,
      type: "folder",
    });

    const providerFolderExists = await getIfFolderExists(fsFolderResource);

    if (!providerFolderExists) {
      await createFolder(fsFolderResource);
    }

    const fsResource = createFsResource({
      rootPath: this.baseFolderPath,
      path: appendPath(this.baseFolderPath, key),
      type: "file",
    });

    try {
      await writeContentRaw(fsResource, encryptedData.toString("base64"));
    } catch (err) {
      console.error("!!!debug", "Error writing encrypted data", err);
    }
  }

  async load<T extends Record<string, any>>(key: string): Promise<T> {
    const fsResource = createFsResource({
      rootPath: this.baseFolderPath,
      path: appendPath(this.baseFolderPath, key),
      type: "file",
    });
    const fileContent = await parseFileRaw({
      resource: fsResource,
    });

    if (fileContent.type === "error") {
      throw new Error(
        `Failed to load encrypted data for key: ${key}, error: ${fileContent.error.message}`
      );
    }

    const encryptedBuffer = Buffer.from(fileContent.content, "base64");
    const decryptedString = safeStorage.decryptString(encryptedBuffer);
    return JSON.parse(decryptedString) as T;
  }

  async delete(key: string): Promise<void> {
    const fsResource = createFsResource({
      rootPath: this.baseFolderPath,
      path: appendPath(this.baseFolderPath, key),
      type: "file",
    });

    await deleteFsResource(fsResource);
  }
}
