import { SecretProviderConfig } from "./types";
import { AbstractProviderRegistry } from "./providerRegistry/AbstractProviderRegistry";

export class SecretsManager {
  private registry: AbstractProviderRegistry;

  constructor(registry: AbstractProviderRegistry) {
    this.registry = registry;
  }

  async initialize(): Promise<void> {
    this.registry.initialize();
  }

  async addProviderConfig(config: SecretProviderConfig) {
    console.log("!!!debug", "addconfig", config);
    this.registry.setProviderConfig(config);
  }

  async removeProviderConfig(id: string) {
    this.registry.deleteProviderConfig(id);
  }

  async getProviderConfig(id: string): Promise<SecretProviderConfig | null> {
    return this.registry.getProviderConfig(id);
  }

  async testProviderConnection(id: string): Promise<boolean> {
    const provider = this.registry.getProvider(id);
    return provider?.testConnection() ?? false;
  }
}
