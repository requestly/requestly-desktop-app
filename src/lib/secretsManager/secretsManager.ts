import { EncryptedFsStorageService } from "./encryptedFsStorageService";
import { ISecretProvider } from "./providerService/ISecretProvider";
import { SecretProviderConfig } from "./types";

export class SecretsManager {
  private providers: Map<string, ISecretProvider> = new Map();

  constructor(private encryptedStorage: EncryptedFsStorageService) {}

  async initialize(): Promise<void> {
    this.encryptedStorage.initialize();
    this.listProviderConfigs().then((configs) => {
      configs.forEach((config) => {
        const providerInstance = this.createProviderInstance(config);
        this.registerProviderInstance(providerInstance);
      });
    });
  }

  async configureProvider(config: SecretProviderConfig) {
    // process the config
    // validate the config
    this.registerProviderInstance(this.createProviderInstance(config));

    this.encryptedStorage.save<SecretProviderConfig>(
      config,
      `providers/${config.id}`,
      {
        keysToEncrypt: ["config"],
      }
    );
  }

  async removeProviderConfig(id: string) {
    this.unregisterProviderInstance(id);
    this.encryptedStorage.delete(`providers/${id}`);
  }

  async getProviderConfig(id: string): Promise<SecretProviderConfig> {
    return this.encryptedStorage.load<SecretProviderConfig>(`providers/${id}`, {
      keysToDecrypt: ["config"],
    });
  }

  async testProviderConnection(id: string): Promise<boolean> {
    const provider = this.getProviderInstance(id);
    return provider?.testConnection();
  }

  private validateProviderConfig(config: SecretProviderConfig): boolean {
    // implement validation logic
    return true;
  }

  private registerProviderInstance(provider: ISecretProvider) {
    this.providers.set(provider.id, provider);
  }

  private getProviderInstance(id: string): ISecretProvider | undefined {
    return this.providers.get(id);
  }

  private listProviderConfigs(): Promise<SecretProviderConfig[]> {
    return [];
  }

  private hasProvider(id: string): boolean {
    return this.providers.has(id);
  }

  private unregisterProviderInstance(id: string): boolean {
    return this.providers.delete(id);
  }

  private createProviderInstance(
    config: SecretProviderConfig
  ): ISecretProvider {}
}
