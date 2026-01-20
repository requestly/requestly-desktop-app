import { safeStorage } from "electron";
import { AbstractEncryptedStorage } from "./AbstractEncryptedStorage";
import {
  appendPath,
  createFsResource,
} from "../../../renderer/actions/local-sync/common-utils";
import {
  createFolder,
  deleteFsResource,
  getIfFileExists,
  getIfFolderExists,
  parseFileRaw,
  writeContentRaw,
} from "../../../renderer/actions/local-sync/fs-utils";

const sanitizeKey = (key: string): string => {
  if (!key) {
    throw new Error("Key cannot be empty");
  }

  // Remove any path separators and directory traversal sequences
  const sanitized = key
    .replace(/\.\./g, "") // Remove ".."
    .replace(/[/\\]/g, "_") // Replace path separators with underscore
    .replace(/^\.+/, "") // Remove leading dots
    .trim();

  if (!sanitized) {
    throw new Error("Key contains only invalid characters");
  }

  return sanitized;
};

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
    const sanitizedKey = sanitizeKey(key);
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
      path: appendPath(this.baseFolderPath, sanitizedKey),
      type: "file",
    });

    const res = await writeContentRaw(
      fsResource,
      encryptedData.toString("base64")
    );
    if (res.type === "error") {
      throw new Error(res.error.message);
    }
  }

  async load<T extends Record<string, any>>(key: string): Promise<T | null> {
    const sanitizedKey = sanitizeKey(key);
    const fsResource = createFsResource({
      rootPath: this.baseFolderPath,
      path: appendPath(this.baseFolderPath, sanitizedKey),
      type: "file",
    });

    const fileExists = await getIfFileExists(fsResource);
    if (!fileExists) {
      return null;
    }

    const fileContent = await parseFileRaw({
      resource: fsResource,
    });

    if (fileContent.type === "error") {
      // File exists but couldn't be read - this is an actual error
      throw new Error(
        `Failed to load encrypted data for key: ${key}, error: ${fileContent.error.message}`
      );
    }

    const encryptedBuffer = Buffer.from(fileContent.content, "base64");
    const decryptedString = safeStorage.decryptString(encryptedBuffer);
    try {
      return JSON.parse(decryptedString) as T;
    } catch (err) {
      throw new Error(`Failed to parse decrypted data for key: ${key}`);
    }
  }

  async delete(key: string): Promise<void> {
    const sanitizedKey = sanitizeKey(key);
    const fsResource = createFsResource({
      rootPath: this.baseFolderPath,
      path: appendPath(this.baseFolderPath, sanitizedKey),
      type: "file",
    });

    const fsResult = await deleteFsResource(fsResource);

    if (fsResult.type === "error") {
      throw new Error(`Failed to delete encrypted data for key: ${key}`);
    }
  }
}
