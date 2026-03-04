import { SecretProviderType } from "../baseTypes";
import {
  CredentialsForProvider,
  ReferenceForProvider,
  SecretValue,
  ValueForProvider,
} from "../types";
import { AbstractSecretsManagerStorage } from "../encryptedStorage/AbstractSecretsManagerStorage";

/**
 * Generic abstract base class for secret providers.
 *
 * @template T - The provider type
 */
export abstract class AbstractSecretProvider<T extends SecretProviderType> {
  protected store: AbstractSecretsManagerStorage;

  abstract readonly type: T;

  abstract readonly id: string;

  protected abstract config: CredentialsForProvider<T>;

  /**
   * Returns the key used to persist/retrieve this secret in the store.
   * Must be unique across all secrets for this provider.
   */
  protected abstract getStorageKey(_ref: ReferenceForProvider<T>): string;

  constructor(store: AbstractSecretsManagerStorage) {
    this.store = store;
  }

  abstract testConnection(): Promise<boolean>;

  abstract getSecret(
    _ref: ReferenceForProvider<T>
  ): Promise<ValueForProvider<T> | null>;

  abstract getSecrets(
    _refs: ReferenceForProvider<T>[]
  ): Promise<(ValueForProvider<T> | null)[]>;

  abstract setSecret(_value: ValueForProvider<T>): Promise<void>;

  abstract setSecrets(
    _entries: Array<{
      value: ValueForProvider<T>;
    }>
  ): Promise<void>;

  abstract removeSecret(_ref: ReferenceForProvider<T>): Promise<void>;

  abstract removeSecrets(_refs: ReferenceForProvider<T>[]): Promise<void>;

  abstract refreshSecrets(): Promise<(ValueForProvider<T> | null)[]>;

  static validateConfig(config: any): boolean {
    // Base implementation rejects all configs as a fail-safe.
    // Provider implementations must override with specific validation.
    if (!config) {
      return false;
    }

    return false;
  }

  protected async getPersistedSecret(
    key: string
  ): Promise<ValueForProvider<T> | null> {
    return this.store.getSecretValue(
      key
    ) as Promise<ValueForProvider<T> | null>;
  }

  protected async persistSecret(
    key: string,
    value: ValueForProvider<T>
  ): Promise<void> {
    return this.store.setSecretValue(key, value);
  }

  protected async persistSecrets(
    entries: Record<string, ValueForProvider<T>>
  ): Promise<void> {
    return this.store.setSecretValues(entries as Record<string, SecretValue>);
  }

  protected async deletePersistedSecret(key: string): Promise<void> {
    return this.store.deleteSecretValue(key);
  }

  protected async deletePersistedSecrets(keys: string[]): Promise<void> {
    return this.store.deleteSecretValues(keys);
  }
}
