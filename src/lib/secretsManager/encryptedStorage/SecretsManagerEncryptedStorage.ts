import {
  AbstractSecretsManagerStorage,
  ProviderStorageChangeCallback,
  SecretStorageChangeCallback,
} from "./AbstractSecretsManagerStorage";
import { EncryptedElectronStore } from "../../storage/EncryptedElectronStore";
import { SecretProviderConfig, SecretReference, SecretValue } from "../types";

export class SecretsManagerEncryptedStorage extends AbstractSecretsManagerStorage {
  private encryptedStore: EncryptedElectronStore;

  constructor(storeName: string) {
    super();
    this.encryptedStore = new EncryptedElectronStore(storeName);
  }

  async setProviderConfig(
    providerId: string,
    data: SecretProviderConfig
  ): Promise<void> {
    return this.encryptedStore.set<SecretProviderConfig>(
      `providers.${providerId}`,
      data
    );
  }

  async setSecretValue(secretId: string, data: SecretValue): Promise<void> {
    return this.encryptedStore.set<SecretValue>(`secrets.${secretId}`, data);
  }

  async setSecretValues(entries: Record<string, SecretValue>): Promise<void> {
    const current =
      this.encryptedStore.get<Record<string, SecretValue>>("secrets") ?? {};
    this.encryptedStore.set<Record<string, SecretValue>>("secrets", {
      ...current,
      ...entries,
    });
  }

  async getProviderConfig(
    providerId: string
  ): Promise<SecretProviderConfig | null> {
    return this.encryptedStore.get<SecretProviderConfig>(
      `providers.${providerId}`
    );
  }

  async getSecretValue(secretId: string): Promise<SecretValue | null> {
    return this.encryptedStore.get<SecretValue>(`secrets.${secretId}`);
  }

  async getAllProviderConfigs(): Promise<SecretProviderConfig[]> {
    const allProviders =
      this.encryptedStore.get<Record<string, SecretProviderConfig>>(
        `providers`
      );
    return Object.values(allProviders ?? {});
  }

  async getAllSecretValues(): Promise<SecretValue[]> {
    const allSecrets =
      this.encryptedStore.get<Record<string, SecretValue>>(`secrets`);
    return Object.values(allSecrets ?? {});
  }

  async deleteProviderConfig(providerId: string): Promise<void> {
    return this.encryptedStore.delete(`providers.${providerId}`);
  }

  async deleteSecretValue(secretId: string): Promise<void> {
    return this.encryptedStore.delete(`secrets.${secretId}`);
  }

  async deleteSecretValues(keys: string[]): Promise<void> {
    const current =
      this.encryptedStore.get<Record<string, SecretValue>>("secrets") ?? {};
    for (const key of keys) {
      delete current[key];
    }
    this.encryptedStore.set<Record<string, SecretValue>>("secrets", current);
  }

  onProvidersChange(callback: ProviderStorageChangeCallback): () => void {
    return this.encryptedStore.onKeyChange<
      Record<string, SecretProviderConfig>
    >("providers", callback);
  }

  onSecretsChange(callback: SecretStorageChangeCallback): () => void {
    return this.encryptedStore.onKeyChange<Record<string, SecretValue>>(
      "secrets",
      callback
    );
  }
}
