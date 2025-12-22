import { ISecretProvider } from "./types";

export class ProviderService {
  private providers: Map<string, ISecretProvider> = new Map();

  private encryptedStorage: EncryptedStorage;
  private cache: SecretCache;

  constructor() {
    this.encryptedStorage = new EncryptedStorage();
    this.cache = new SecretCache();
  }

  /**
   * Initialize vault (load key, load existing providers)
   */
  async initialize(): Promise<void> {
    // Load vault key from safeStorage
    const keyManager = new KeyManager();

    if (await keyManager.hasKey()) {
      this.vaultKey = await keyManager.retrieveKey();
      this.isLocked = false;

      // Load all existing provider configs
      await this.loadProviders();
    }

    this.isInitialized = true;
  }

  /**
   * Configure a provider (create new or update existing)
   */
  async configureProvider(
    id: string,
    type: SecretProviderType,
    name: string,
    config: SecretProviderConfig
  ): Promise<SecretProviderMetadata> {
    if (!this.vaultKey) {
      throw new Error("Vault is locked");
    }

    // 1. Create or get existing provider instance
    let provider = this.providers.get(id);

    if (!provider) {
      // Create new provider instance
      provider = this.createProvider(id, type, name);
    }

    // 2. Configure the provider (validates & tests connection)
    await provider.configure(config);

    // 3. Save encrypted config to disk
    await this.encryptedStorage.saveProviderConfig(
      id,
      {
        type,
        name,
        config,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      this.vaultKey
    );

    // 4. Store in memory
    this.providers.set(id, provider);

    // 5. Clear cache for this provider
    this.cache.invalidateByProvider(id);

    return provider.getMetadata();
  }

  /**
   * Remove a provider
   */
  async removeProvider(id: string): Promise<void> {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Provider not found: ${id}`);
    }

    // 1. Disconnect
    await provider.disconnect();

    // 2. Remove from memory
    this.providers.delete(id);

    // 3. Delete encrypted config
    await this.encryptedStorage.deleteProviderConfig(id);

    // 4. Clear cache
    this.cache.invalidateByProvider(id);
  }

  /**
   * List all configured providers
   */
  listProviders(): SecretProviderMetadata[] {
    return Array.from(this.providers.values()).map((p) => p.getMetadata());
  }

  /**
   * Get a specific provider
   */
  getProvider(id: string): ISecretProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Resolve a secret
   */
  async resolveSecret(providerId: string, secretName: string): Promise<string> {
    // Check cache
    const cacheKey = `${providerId}/${secretName}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached.value;
    }

    // Get provider
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!provider.isConfigured) {
      throw new Error(`Provider not configured: ${providerId}`);
    }

    // Fetch from provider
    const value = await provider.fetchSecret(secretName);

    // Cache it
    this.cache.set(cacheKey, {
      value,
      provider: providerId,
      expiresAt: Date.now() + this.getTTL(provider.type),
    });

    return value;
  }

  /**
   * Load providers from disk on startup
   */
  private async loadProviders(): Promise<void> {
    const providerIds = await this.encryptedStorage.listProviders();

    for (const id of providerIds) {
      try {
        const saved = await this.encryptedStorage.loadProviderConfig(
          id,
          this.vaultKey!
        );

        // Create provider instance
        const provider = this.createProvider(id, saved.type, saved.name);

        // Configure it with saved config
        await provider.configure(saved.config);

        // Store in memory
        this.providers.set(id, provider);
      } catch (error) {
        console.error(`Failed to load provider ${id}:`, error);
      }
    }
  }

  /**
   * Factory method to create provider instances
   */
  private createProvider(
    id: string,
    type: SecretProviderType,
    name: string
  ): ISecretProvider {
    switch (type) {
      case SecretProviderType.AWS_SECRETS_MANAGER:
        return new AWSSecretsManagerProvider(id, name);

      case SecretProviderType.HASHICORP_VAULT:
        return new HashiCorpVaultProvider(id, name);

      case SecretProviderType.AZURE_KEY_VAULT:
        return new AzureKeyVaultProvider(id, name);

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

//   private getTTL(type: SecretProviderType): number {
//     const TTL_CONFIG = {
//       [SecretProviderType.AWS_SECRETS_MANAGER]: 5 * 60 * 1000, // 5 min
//       [SecretProviderType.HASHICORP_VAULT]: 1 * 60 * 1000, // 1 min
//       [SecretProviderType.AZURE_KEY_VAULT]: 5 * 60 * 1000, // 5 min
//       [SecretProviderType.LOCAL_VAULT]: Infinity, // Never expire
//     };
//     return TTL_CONFIG[type];
//   }
// }
