import { safeStorage } from "electron";

export class EncryptedFsStorageService {
  constructor(private readonly baseFolderPath: string) {}

  async initialize(): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      // Show trouble shooting steps to user
      throw new Error("Encryption is not available on this system. ");
    }

    // initialize directories
  }

  async save(
    data: Record<string, any>,
    path: string,
    keysToEncrypt: string[] = []
  ): Promise<void> {
    // encrypted
  }

  async load(path: string, keysToDecrypt: string[] = []): Promise<> {}

  async delete(path: string): Promise<void> {}
}
