import { SecretProviderConfig, SecretProviderType } from "../types";
import { createProviderInstance } from "../providerService/providerFactory";
import { AbstractSecretProvider } from "../providerService/AbstractSecretProvider";
import {
  AbstractProviderRegistry,
  ProviderChangeCallback,
} from "./AbstractProviderRegistry";

export class FileBasedProviderRegistry extends AbstractProviderRegistry {
  private changeCallbacks: Set<ProviderChangeCallback> = new Set();

  async initialize(): Promise<void> {
    await this.initProvidersFromStorage();
    this.setupStorageListener();
  }

  private async initProvidersFromStorage(): Promise<void> {
    const configs = await this.getAllProviderConfigs();
    configs.forEach((config) => {
      this.providers.set(config.id, createProviderInstance(config)); // TODO: check if this needs error handling
    });
  }

  async getAllProviderConfigs(): Promise<SecretProviderConfig[]> {
    const allConfigs = this.store.getAll();
    return allConfigs;
  }

  async getProviderConfig(id: string): Promise<SecretProviderConfig | null> {
    return this.store.get(id);
  }

  async setProviderConfig(config: SecretProviderConfig): Promise<void> {
    const provider = createProviderInstance(config);
    await this.store.set(config.id, config);
    this.providers.set(config.id, provider);
  }

  async deleteProviderConfig(id: string): Promise<void> {
    await this.store.delete(id);
    this.providers.delete(id);
  }

  getProvider(providerId: string): AbstractSecretProvider<SecretProviderType> | null {
    return this.providers.get(providerId) ?? null;
  }

  onProvidersChange(callback: ProviderChangeCallback): () => void {
    this.changeCallbacks.add(callback);

    return () => {
      this.changeCallbacks.delete(callback);
    };
  }

  private setupStorageListener(): void {
    this.store.onStorageChange((data) => {
      this.syncProvidersFromStorageData(data);
      this.notifyChangeCallbacks(data);
    });
  }

  private syncProvidersFromStorageData(
    data: Record<string, SecretProviderConfig>
  ): void {
    const newConfigIds = new Set(Object.keys(data));
    const existingProviderIds = new Set(this.providers.keys());

    // Remove providers that no longer exist
    for (const existingId of existingProviderIds) {
      if (!newConfigIds.has(existingId)) {
        this.providers.delete(existingId);
      }
    }

    for (const [id, config] of Object.entries(data)) {
      // recreate provider instance
      this.providers.set(id, createProviderInstance(config));
    }
  }

  private notifyChangeCallbacks(
    data: Record<string, SecretProviderConfig>
  ): void {
    this.changeCallbacks.forEach((callback) => {
      const configsMetadata = Object.values(data).map((config) => {
        const { config: _, ...metadata } = config;
        return metadata;
      });
      callback(configsMetadata);
    });
  }
}
