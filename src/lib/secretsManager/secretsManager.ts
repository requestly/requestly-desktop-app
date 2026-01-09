import { SecretsCacheService } from "./cacheService";
import { IProviderRegistry } from "./providerRegistry/IProviderRegistry";
import { createProvider } from "./providerService/providerFactory";
import { SecretProviderConfig, SecretReference } from "./types";
import { AbstractSecretProvider } from "./providerService/ISecretProvider";

// Questions
// 1. store multiple versions of the same secret or not?
// 2. use secretReference or do it like mp with union types?
// 3. cache invalidation strategy?
// 4. Need a new method for refreshing all the cached secrets
// --5. reuse the storage interface for encrypted storage and cache storage?

// Functions
// 1. initialize registry and cache service
// 2. add/remove provider configs
// 3. fetch secret (with caching)
// 4. list secrets
// 5. invalidate cache

// FLows
// 1. INIT - load all provider configs from the registry and create provider instances.
// 2. ADD/REMOVE PROVIDER CONFIG - update the registry and provider instances map.
// 3. FETCH SECRET - check cache first, if not found or expired, fetch from provider, store in cache, return secret.
// 4. Refresh Secrets - bulk fetch and update all secrets from their providers and update the cache
//

export class SecretsManager {
  private registry: IProviderRegistry;

  private cacheService: SecretsCacheService;

  private providers: Map<string, AbstractSecretProvider> = new Map();

  constructor(registry: IProviderRegistry, cacheService: SecretsCacheService) {
    this.registry = registry;
    this.cacheService = cacheService;
  }

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
    return provider?.testConnection() ?? false;
  }

  async fetchSecret(providerId: string, ref: SecretReference): Promise<string> {
    const cached = await this.cacheService.get(
      providerId,
      ref.identifier,
      ref.version
    );

    if (cached) {
      return cached;
    }

    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const secret = await provider.fetchSecret(ref);

    await this.cacheService.set(
      providerId,
      provider.type,
      ref.identifier,
      secret,
      ref.version
    );

    return secret;
  }

  async refreshSecrets(
    secrets: Array<{ providerId: string; ref: SecretReference }>
  ): Promise<void> {
    for (const s of secrets) {
      // Invalidate cache
      // Fetch fresh secret and update cache
    }
  }

  async fetchSecrets(
    secrets: Array<{ providerId: string; ref: SecretReference }>
  ): Promise<Map<string, string>> {
    for (const s of secrets) {
      const secret = await this.fetchSecret(s.providerId, s.ref);
    }
  }

  // Do we need this method?
  async fetchSecretFresh(
    providerId: string,
    ref: SecretReference
  ): Promise<string> {
    await this.cacheService.invalidate(providerId, ref.identifier, ref.version);

    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const secret = await provider.fetchSecret(ref);

    await this.cacheService.set(
      providerId,
      provider.type,
      ref.identifier,
      secret,
      ref.version
    );

    return secret;
  }

  async listSecrets(providerId: string): Promise<string[]> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    return provider.listSecrets();
  }

  async invalidateCache(providerId?: string): Promise<void> {
    if (providerId) {
      await this.cacheService.invalidateByProvider(providerId);
    } else {
      await this.cacheService.clear();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private createProviderInstance(
    config: SecretProviderConfig
  ): AbstractSecretProvider {
    return createProvider(config);
  }
}
