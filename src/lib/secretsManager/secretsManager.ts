import { SecretProviderConfig } from "./types";
import { AbstractProviderRegistry } from "./providerRegistry/AbstractProviderRegistry";

export class SecretsManager {
  private registry: AbstractProviderRegistry;

  constructor(registry: AbstractProviderRegistry) {
    this.registry = registry;
  }

  async initialize(): Promise<void> {
    await this.registry.initialize();
  }

  async addProviderConfig(config: SecretProviderConfig) {
    console.log("!!!debug", "addconfig", config);
    await this.registry.setProviderConfig(config);
  }

  async removeProviderConfig(id: string) {
    await this.registry.deleteProviderConfig(id);
  }

  async getProviderConfig(id: string): Promise<SecretProviderConfig | null> {
    return this.registry.getProviderConfig(id);
  }
}
