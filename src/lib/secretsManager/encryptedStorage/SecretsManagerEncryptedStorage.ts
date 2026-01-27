import {
  AbstractSecretsManagerStorage,
  StorageChangeCallback,
} from "./AbstractSecretsManagerStorage";
import { EncryptedElectronStore } from "../../storage/EncryptedElectronStore";
import { SecretProviderConfig } from "../types";

export class SecretsManagerEncryptedStorage extends AbstractSecretsManagerStorage {
  private encryptedStore: EncryptedElectronStore;

  constructor(storeName: string) {
    super();
    this.encryptedStore = new EncryptedElectronStore(storeName);
  }

  async set(key: string, data: SecretProviderConfig): Promise<void> {
    return this.encryptedStore.set<SecretProviderConfig>(key, data);
  }

  async get(key: string): Promise<SecretProviderConfig | null> {
    return this.encryptedStore.get<SecretProviderConfig>(key);
  }

  async getAll(): Promise<SecretProviderConfig[]> {
    const allData = this.encryptedStore.getAll<SecretProviderConfig>();
    return Object.values(allData);
  }

  async delete(key: string): Promise<void> {
    return this.encryptedStore.delete(key);
  }

  onStorageChange(callback: StorageChangeCallback): () => void {
    return this.encryptedStore.onChange<SecretProviderConfig>(callback);
  }
}
