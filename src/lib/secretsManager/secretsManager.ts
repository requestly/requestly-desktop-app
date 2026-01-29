import { SecretProviderConfig, SecretReference, SecretValue } from "./types";
import {
  AbstractProviderRegistry,
  ProviderChangeCallback,
} from "./providerRegistry/AbstractProviderRegistry";
import {
  SecretsResultPromise,
  createSecretsError,
  SecretsErrorCode,
} from "./errors";

export class SecretsManager {
  private static instance: SecretsManager | null = null;

  private static initPromise: Promise<void> | null = null;

  private registry: AbstractProviderRegistry;

  private constructor(registry: AbstractProviderRegistry) {
    this.registry = registry;
  }

  /**
   * Initialize the SecretsManager singleton. Must be called once at app startup.
   */
  static async initialize(registry: AbstractProviderRegistry): Promise<void> {
    if (this.instance) {
      // Already initialized, return completed promise
      return this.initPromise!;
    }

    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          this.instance = new SecretsManager(registry);
          await this.instance.registry.initialize();
        } catch (err) {
          this.instance = null;
          this.initPromise = null;
          throw err;
        }
      })();
    }

    return this.initPromise;
  }

  /**
   * Get the initialized SecretsManager instance.
   */
  static getInstance(): SecretsManager {
    if (!this.instance) {
      throw new Error(
        "SecretsManager not initialized. Call and await SecretsManager.initialize() first."
      );
    }
    return this.instance;
  }

  static isInitialized(): boolean {
    return this.instance !== null;
  }

  static reset(): void {
    this.instance = null;
    this.initPromise = null;
  }

  async setProviderConfig(
    config: SecretProviderConfig
  ): SecretsResultPromise<void> {
    try {
      await this.registry.setProviderConfig(config);
      return { type: "success" };
    } catch (error) {
      return createSecretsError(
        SecretsErrorCode.STORAGE_WRITE_FAILED,
        error instanceof Error ? error.message : String(error),
        {
          providerId: config.id,
          cause: error as Error,
        }
      );
    }
  }

  async removeProviderConfig(id: string): SecretsResultPromise<void> {
    try {
      await this.registry.deleteProviderConfig(id);
      return { type: "success" };
    } catch (error) {
      return createSecretsError(
        SecretsErrorCode.STORAGE_WRITE_FAILED,
        error instanceof Error ? error.message : String(error),
        {
          providerId: id,
          cause: error as Error,
        }
      );
    }
  }

  async getProviderConfig(
    id: string
  ): SecretsResultPromise<SecretProviderConfig | null> {
    try {
      const config = await this.registry.getProviderConfig(id);
      return { type: "success", data: config };
    } catch (error) {
      return createSecretsError(
        SecretsErrorCode.STORAGE_READ_FAILED,
        error instanceof Error ? error.message : String(error),
        {
          providerId: id,
          cause: error as Error,
        }
      );
    }
  }

  async testProviderConnection(id: string): SecretsResultPromise<boolean> {
    try {
      const provider = this.registry.getProvider(id);

      if (!provider) {
        return createSecretsError(
          SecretsErrorCode.PROVIDER_NOT_FOUND,
          `Provider with id ${id} not found`,
          { providerId: id }
        );
      }

      const isConnected = await provider.testConnection();
      return { type: "success", data: isConnected ?? false };
    } catch (error) {
      return createSecretsError(
        SecretsErrorCode.AUTH_FAILED,
        error instanceof Error
          ? error.message
          : `Failed to test connection for provider ${id}`,
        { providerId: id, cause: error as Error }
      );
    }
  }

  async getSecret(
    providerId: string,
    ref: SecretReference
  ): SecretsResultPromise<SecretValue | null> {
    try {
      const provider = this.registry.getProvider(providerId);
      if (!provider) {
        return createSecretsError(
          SecretsErrorCode.PROVIDER_NOT_FOUND,
          `Provider with id ${providerId} not found`,
          { providerId }
        );
      }
      const secretValue = await provider.getSecret(ref);
      return { type: "success", data: secretValue };
    } catch (error) {
      return createSecretsError(
        SecretsErrorCode.SECRET_FETCH_FAILED,
        error instanceof Error
          ? error.message
          : `Failed to fetch secret from provider`,
        { providerId, secretRef: ref, cause: error as Error }
      );
    }
  }

  async getSecrets(
    secrets: Array<{ providerId: string; ref: SecretReference }>
  ): SecretsResultPromise<SecretValue[]> {
    const providerMap: Map<string, SecretReference[]> = new Map();

    for (const s of secrets) {
      if (!providerMap.has(s.providerId)) {
        providerMap.set(s.providerId, []);
      }
      providerMap.get(s.providerId)?.push(s.ref);
    }

    const results: SecretValue[] = [];

    // Handle partial failures appropriately
    for (const [providerId, refs] of providerMap.entries()) {
      try {
        const provider = this.registry.getProvider(providerId);
        if (!provider) {
          return createSecretsError(
            SecretsErrorCode.PROVIDER_NOT_FOUND,
            `Provider with id ${providerId} not found`,
            { providerId }
          );
        }

        const secretValues = await provider.getSecrets(refs);
        results.push(
          ...secretValues.filter((sv): sv is SecretValue => sv !== null)
        );
      } catch (error) {
        return createSecretsError(
          SecretsErrorCode.SECRET_FETCH_FAILED,
          error instanceof Error
            ? error.message
            : `Failed to fetch secrets from provider ${providerId}`,
          { providerId, cause: error as Error }
        );
      }
    }

    return { type: "success", data: results };
  }

  async refreshSecrets(
    providerId: string
  ): SecretsResultPromise<(SecretValue | null)[]> {
    try {
      const provider = this.registry.getProvider(providerId);

      if (!provider) {
        return createSecretsError(
          SecretsErrorCode.PROVIDER_NOT_FOUND,
          `Provider with id ${providerId} not found`,
          { providerId }
        );
      }

      const secrets = await provider.refreshSecrets();

      return { type: "success", data: secrets };
    } catch (error) {
      return createSecretsError(
        SecretsErrorCode.SECRET_FETCH_FAILED,
        error instanceof Error
          ? error.message
          : `Failed to refresh secrets for provider ${providerId}`,
        { providerId, cause: error as Error }
      );
    }
  }

  async listProviders(): SecretsResultPromise<
    Omit<SecretProviderConfig, "config">[]
  > {
    try {
      const configs = await this.registry.getAllProviderConfigs();
      const configMetadata: Omit<SecretProviderConfig, "config">[] =
        configs.map(({ config: _, ...rest }) => rest);
      return { type: "success", data: configMetadata };
    } catch (error) {
      return createSecretsError(
        SecretsErrorCode.STORAGE_READ_FAILED,
        error instanceof Error ? error.message : "Failed to list providers",
        { cause: error as Error }
      );
    }
  }

  onProvidersChange(callback: ProviderChangeCallback): () => void {
    return this.registry.onProvidersChange(callback);
  }
}
