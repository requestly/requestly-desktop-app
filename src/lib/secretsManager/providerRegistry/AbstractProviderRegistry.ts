import {
  SecretProviderConfig,
  SecretProviderMetadata,
  SecretProviderType,
} from "../types";
import { AbstractSecretsManagerStorage } from "../encryptedStorage/AbstractSecretsManagerStorage";
import { AbstractSecretProvider } from "../providerService/AbstractSecretProvider";

export type ProviderChangeCallback = (
  configs: SecretProviderMetadata[]
) => void;

export abstract class AbstractProviderRegistry {
  protected store: AbstractSecretsManagerStorage;

  protected providers: Map<string, AbstractSecretProvider<SecretProviderType>> =
    new Map();

  constructor(store: AbstractSecretsManagerStorage) {
    this.store = store;
  }

  abstract initialize(): Promise<void>;

  abstract getAllProviderConfigs(): Promise<SecretProviderConfig[]>;

  abstract getProviderConfig(_id: string): Promise<SecretProviderConfig | null>;

  abstract setProviderConfig(_config: SecretProviderConfig): Promise<void>;

  abstract deleteProviderConfig(_id: string): Promise<void>;

  abstract onProvidersChange(callback: ProviderChangeCallback): () => void;

  abstract getProvider(
    _providerId: string
  ): AbstractSecretProvider<SecretProviderType> | null;

  /**
   * Type-safe method to get a provider with a specific type.
   * Returns the provider cast to the correct generic type.
   */
  getTypedProvider<T extends SecretProviderType>(
    providerId: string,
    expectedType: T
  ): AbstractSecretProvider<T> | null {
    const provider = this.getProvider(providerId);
    if (provider && provider.type === expectedType) {
      return provider as AbstractSecretProvider<T>;
    }
    return null;
  }
}
