/* eslint-disable no-use-before-define */
import { SecretProviderConfig, SecretReference, SecretValue } from "./types";
import { AbstractProviderRegistry } from "./providerRegistry/AbstractProviderRegistry";

export class SecretsManager {
  private static instance: SecretsManager | null = null;

  private static initPromise: Promise<void> | null = null;

  private registry: AbstractProviderRegistry;

  private constructor(registry: AbstractProviderRegistry) {
    this.registry = registry;
  }

  /**
   * Initialize the SecretsManager singleton. Must be called once at app startup.
   * Safe to call multiple times - subsequent calls return the same promise.
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
   * Throws if initialize() hasn't been called and awaited.
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

  async setProviderConfig(config: SecretProviderConfig) {
    console.log("!!!debug", "addconfig", config);
    await this.registry.setProviderConfig(config);
  }

  async removeProviderConfig(id: string) {
    await this.registry.deleteProviderConfig(id);
  }

  async getProviderConfig(id: string): Promise<SecretProviderConfig | null> {
    return this.registry.getProviderConfig(id);
  }

  async testProviderConnection(id: string): Promise<boolean> {
    const provider = this.registry.getProvider(id);

    if (!provider) {
      throw new Error(`Provider with id ${id} not found`);
    }

    const isConnected = await provider.testConnection();

    return isConnected ?? false;
  }

  async getSecret(
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

  async getSecrets(
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

      if (!provider) {
        continue;
      }

      const secretValues = await provider.getSecrets(refs);

      results.push(
        ...secretValues.filter((sv): sv is SecretValue => sv !== null)
      );
    }

    return results;
  }

  async refreshSecrets(providerId: string): Promise<(SecretValue | null)[]> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider with id ${providerId} not found`);
    }

    return provider.refreshSecrets();
  }
}

/**
 * // At app startup (once):
 * await SecretsManager.initialize(registry);
 *
 * // Everywhere else:
 * import { getSecretsManager } from "./secretsManager";
 * const secretsManager = getSecretsManager();
 * await secretsManager.getSecret(...);
 */
export function getSecretsManager(): SecretsManager {
  return SecretsManager.getInstance();
}
