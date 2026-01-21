import Store from "electron-store";
import { safeStorage } from "electron";

interface EncryptedStoreSchema {
  version: number;
  data: Record<string, string>; // { [key]: base64 encrypted value }
}

const STORE_VERSION = 1;

/**
 * Generic encrypted key-value storage using electron-store + Electron's safeStorage.
 * - OS-level encryption via safeStorage (Keychain/DPAPI/libsecret)
 *
 * Storage location: <userData>/storage/<storeName>.json
 *
 * Structure:
 * ```json
 * {
 *   "version": 1,
 *   "data": {
 *     "key1": "<base64-safeStorage-encrypted>",
 *     "key2": "<base64-safeStorage-encrypted>"
 *   }
 * }
 * ```
 */
export class EncryptedElectronStore {
  private store: Store<EncryptedStoreSchema>;

  constructor(storeName: string) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "Encryption is not available on this system. Please ensure your operating system's secure storage is properly configured."
      );
    }

    const storeOptions: Store.Options<EncryptedStoreSchema> = {
      name: storeName,
      cwd: "storage",
      serialize: (data) => {
        const jsonString = JSON.stringify(data);
        const encrypted = safeStorage.encryptString(jsonString);
        const base64 = encrypted.toString("base64");
        return base64;
      },
      deserialize: (data) => {
        const encryptedBuffer = Buffer.from(data, "base64");
        const decrypted = safeStorage.decryptString(encryptedBuffer);
        return JSON.parse(decrypted) as EncryptedStoreSchema;
      },
      defaults: {
        version: STORE_VERSION,
        data: {},
      },
    };

    this.store = new Store<EncryptedStoreSchema>(storeOptions);
  }

  set<T>(key: string, data: T) {
    this.store.set(`data.${key}`, data);
  }

  get<T>(key: string): T | null {
    const data = this.store.get(`data.${key}`) as T;
    return data ?? null;
  }

  getAll<T>(): T {
    return this.store.get("data") as T;
  }

  delete(key: string): void {
    this.store.delete(`data.${key}` as keyof EncryptedStoreSchema);
  }

  /**
   * Check if a key exists in storage.
   *
   * @param key - Storage key
   * @returns true if key exists, false otherwise
   */
  has(key: string): boolean {
    return this.store.has(`data.${key}` as keyof EncryptedStoreSchema);
  }

  /**
   * Get all keys in storage.
   *
   * @returns Array of all storage keys
   */
  keys(): string[] {
    return Object.keys(this.store.get("data"));
  }

  /**
   * Clear all data from storage.
   */
  clear(): void {
    this.store.set("data", {});
  }

  /**
   * Registers a callback for when storage changes.
   *
   * @param callback - Function to call when data changes
   * @returns Unsubscribe function
   */
  onChange(callback: (_data: Record<string, string>) => void): () => void {
    return this.store.onDidChange("data", (newValue) => {
      if (newValue) {
        callback(newValue);
      }
    });
  }

  getStore(): Store<EncryptedStoreSchema> {
    return this.store;
  }
}
