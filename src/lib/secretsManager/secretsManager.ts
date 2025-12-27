import { IProviderRegistry } from "./providerRegistry/IProviderRegistry";
import { ISecretProvider } from "./providerService/ISecretProvider";
import { SecretProviderConfig } from "./types";

export class SecretsManager {
  private providers: Map<string, ISecretProvider> = new Map();

  constructor(private registry: IProviderRegistry) {}

  async initialize(): Promise<void> {
    this.registry.initialize();
    this.initProvidersFromManifest();
  }

  private async initProvidersFromManifest() {
    const configs = await this.registry.loadAllProviderConfigs();
    configs.forEach((config) => {
      this.providers.set(config.id, this.createProviderInstance(config));
    });
  }

  async addProviderConfig(config: SecretProviderConfig) {
    this.providers.set(config.id, this.createProviderInstance(config));
    this.registry.saveProviderConfig(config);
  }

  async removeProviderConfig(id: string) {
    this.providers.delete(id);
    this.registry.deleteProviderConfig(id);
  }

  async getProviderConfig(id: string): Promise<SecretProviderConfig | null> {
    return this.registry.getProviderConfig(id);
  }

  async testProviderConnection(id: string): Promise<boolean> {
    const provider = this.providers.get(id);
    return provider?.testConnection();
  }

  private createProviderInstance(
    config: SecretProviderConfig
  ): ISecretProvider {}
}
