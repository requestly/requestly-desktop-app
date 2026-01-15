import { SecretProviderConfig, SecretReference, SecretValue } from "./types";
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

  async fetchSecret(
    providerId: string,
    ref: SecretReference
  ): Promise<SecretValue | null> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider with id ${providerId} not found`);
    }

    const secretValue = await provider.getSecret(ref);

    return secretValue;
  }

  async fetchSecrets(
    secrets: Array<{ providerId: string; ref: SecretReference }>
  ): Promise<SecretValue[]> {
    const providerMap: Map<string, SecretReference[]> = new Map();

    for (const s of secrets) {
      if (!providerMap.has(s.providerId)) {
        providerMap.set(s.providerId, []);
      }
      providerMap.get(s.providerId)?.push(s.ref);
    }

    const results: SecretValue[] = [];

    for (const [providerId, refs] of providerMap.entries()) {
      const provider = this.registry.getProvider(providerId);
      if (provider) {
        console.warn(`Provider with id ${providerId} not found`);

        const secretValues = await provider.getSecrets(refs);
        results.push(...secretValues);
      }
    }

    return results;
  }

  async refreshSecrets(providerId: string): Promise<SecretValue[]> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider with id ${providerId} not found`);
    }

    return provider.refreshSecrets();
  }
}
