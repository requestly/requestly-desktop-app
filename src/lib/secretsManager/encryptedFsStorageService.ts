import { safeStorage } from "electron";

interface EncryptionConfig<T = any> {
  keysToEncrypt?: (keyof T)[];
}

interface DecryptionConfig<T = any> {
  keysToDecrypt?: (keyof T)[];
}

export class EncryptedFsStorageService {
  constructor(private readonly baseFolderPath: string) {}

  async initialize(): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      // Show trouble shooting steps to user
      throw new Error("Encryption is not available on this system. ");
    }

    // initialize directories
  }

  async save<T extends Record<string, any>>(
    data: T,
    path: string,
    encryptConfig: EncryptionConfig<T>
  ): Promise<void> {
    // encrypted
  }

  async load<T extends Record<string, any>>(
    path: string,
    decryptConfig: DecryptionConfig<T>
  ): Promise<T> {}

  async delete(path: string): Promise<void> {}
}
