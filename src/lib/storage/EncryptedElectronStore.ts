import Store from "electron-store";
import { safeStorage } from "electron";

interface EncryptedStoreSchema {
  version: number;
  data: Record<string, any>;
}

const STORE_VERSION = 1;

/**
 * Generic encrypted key-value storage using electron-store + Electron's safeStorage.
 * - OS-level encryption via safeStorage (Keychain/DPAPI/libsecret)
 *
 * Storage location: <userData>/storage/<storeName>.txt
 *
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
      watch: true,
      fileExtension: "txt",
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
      schema: {
        version: { type: "number" },
        data: { type: "object", additionalProperties: true },
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

  has(key: string): boolean {
    return this.store.has(`data.${key}` as keyof EncryptedStoreSchema);
  }

  keys(): string[] {
    return Object.keys(this.store.get("data"));
  }

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
