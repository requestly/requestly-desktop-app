import { SecretProviderConfig } from "../types";
import { createProviderInstance } from "../providerService/providerFactory";
import { AbstractSecretProvider } from "../providerService/AbstractSecretProvider";
import { AbstractProviderRegistry } from "./AbstractProviderRegistry";

export class FileBasedProviderRegistry extends AbstractProviderRegistry {
  async initialize(): Promise<void> {
    await this.initProvidersFromStorage();
  }

  private async initProvidersFromStorage(): Promise<void> {
    const configs = await this.getAllProviderConfigs();
    configs.forEach((config) => {
      this.providers.set(config.id, createProviderInstance(config));
    });
  }

  async getAllProviderConfigs(): Promise<SecretProviderConfig[]> {
    const allConfigs = this.store.getAll();
    return allConfigs;
  }

  async getProviderConfig(id: string): Promise<SecretProviderConfig | null> {
    try {
      return await this.store.get(id);
    } catch (error) {
      console.error(`Failed to load provider config for id: ${id}`, error);
      return null;
    }
  }

  async setProviderConfig(config: SecretProviderConfig): Promise<void> {
    await this.store.set(config.id, config);
    this.providers.set(config.id, createProviderInstance(config));
  }

  async deleteProviderConfig(id: string): Promise<void> {
    await this.store.delete(id);
    this.providers.delete(id);
  }

  getProvider(providerId: string): AbstractSecretProvider | null {
    return this.providers.get(providerId) ?? null;
  }
}
