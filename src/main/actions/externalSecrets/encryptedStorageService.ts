// main/services/vault/EncryptedStorage.ts

import { safeStorage } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import {
  SecretProviderConfig,
  SecretProviderType,
} from "./providerService/types";
import { GLOBAL_CONFIG_FOLDER_PATH } from "renderer/actions/local-sync/constants";

/**
 * Stored provider configuration
 */
interface StoredProviderConfig {
  type: SecretProviderType;
  name: string;
  config: SecretProviderConfig;
  createdAt: number;
  updatedAt: number;
}

/**
 * EncryptedStorage using Electron's safeStorage API
 *
 * All encryption is handled by safeStorage (OS-level):
 * - macOS: Keychain
 * - Windows: DPAPI
 * - Linux: libsecret
 *
 * No need for separate vault key or CryptoService!
 */
export class EncryptedStorage {
  private readonly basePath: string;

  private readonly providersPath: string;

  constructor(baseFolder: string) {
    this.basePath = path.join(GLOBAL_CONFIG_FOLDER_PATH);
    this.providersPath = path.join(this.basePath, baseFolder);
  }

  async initialize(): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "Encryption is not available on this system. " +
          "This may happen on Linux if libsecret is not installed."
      );
    }

    await fs.mkdir(this.providersPath, { recursive: true });
  }

  async save(
    data: Record<string, any>,
    fileName: string,
    keysToEncrypt: string[] = []
  ): Promise<void> {
    const stored: any = {
      ...data,
      updatedAt: Date.now(),
    };

    // 2. Encrypt sensitive keys within the config
    for (const key of keysToEncrypt) {
      if (stored[key] !== undefined) {
        const sensitiveValue = JSON.stringify(stored[key]);
        const encrypted = safeStorage.encryptString(sensitiveValue);
        stored[key] = encrypted.toString("base64");
      }
    }

    const json = JSON.stringify(stored);

    const filePath = this.getProviderFilePath(fileName);
    const tempFilePath = `${filePath}.tmp`;
    await fs.writeFile(tempFilePath, json);
    await fs.rename(tempFilePath, filePath);
  }

  async load(
    fileName: string,
    keysToDecrypt: string[] = []
  ): Promise<StoredProviderConfig | null> {
    const filePath = this.getProviderFilePath(fileName);

    try {
      const encrypted = await fs.readFile(filePath);

      const stored: any = JSON.parse(encrypted.toString());

      // Decrypt sensitive keys within the config
      for (const key of keysToDecrypt) {
        if (stored[key] !== undefined) {
          const encryptedBuffer = Buffer.from(stored[key], "base64");
          const decrypted = safeStorage.decryptString(encryptedBuffer);
          stored[key] = JSON.parse(decrypted);
        }
      }

      return stored as StoredProviderConfig;
    } catch (error: any) {
      // TODO: check error handling
      if (error.code === "ENOENT") {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  /**
   * Delete provider configuration
   */
  async delete(fileName: string): Promise<void> {
    const filePath = this.getProviderFilePath(fileName);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // TODO: check error handling
      if (error.code !== "ENOENT") {
        throw error;
      }
      // Ignore if file doesn't exist
    }
  }

  /**
   * Get file path for a provider
   */
  private getProviderFilePath(fileName: string): string {
    return path.join(this.providersPath, `${fileName}.enc`);
  }
}
