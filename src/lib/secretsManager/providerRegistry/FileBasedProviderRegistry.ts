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
      this.providers.set(config.id, createProviderInstance(config, this.store));
    });
  }

  async getAllProviderConfigs(): Promise<SecretProviderConfig[]> {
    return this.store.getAllProviderConfigs();
  }

  async getProviderConfig(id: string): Promise<SecretProviderConfig | null> {
    return this.store.getProviderConfig(id);
  }

  async setProviderConfig(config: SecretProviderConfig): Promise<void> {
    const provider = createProviderInstance(config, this.store);
    await this.store.setProviderConfig(config.id, config);
    this.providers.set(config.id, provider);
  }

  async deleteProviderConfig(id: string): Promise<void> {
    await this.store.deleteProviderConfig(id);
    this.providers.delete(id);
  }

  getProvider(
    providerId: string
  ): AbstractSecretProvider<SecretProviderType> | null {
    return this.providers.get(providerId) ?? null;
  }

  onProvidersChange(callback: ProviderChangeCallback): () => void {
    this.changeCallbacks.add(callback);

    return () => {
      this.changeCallbacks.delete(callback);
    };
  }

  private setupStorageListener(): void {
    this.store.onProvidersChange((providers) => {
      this.syncProvidersFromStorageData(providers);
      this.notifyChangeCallbacks(providers);
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
      this.providers.set(id, createProviderInstance(config, this.store));
    }
  }

  private notifyChangeCallbacks(
    data: Record<string, SecretProviderConfig>
  ): void {
    this.changeCallbacks.forEach((callback) => {
      const configsMetadata = Object.values(data).map((config) => {
        const { credentials: _, ...metadata } = config;
        return metadata;
      });
      callback(configsMetadata);
    });
  }
}
