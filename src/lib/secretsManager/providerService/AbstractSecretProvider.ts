import { SecretProviderType } from "../baseTypes";
import {
  CredentialsForProvider,
  ReferenceForProvider,
  SecretValue,
  ValueForProvider,
} from "../types";
import { AbstractSecretsManagerStorage } from "../encryptedStorage/AbstractSecretsManagerStorage";

export interface GetSecretValuesResult<T extends SecretProviderType> {
  results: (ValueForProvider<T> | null)[];
  errors: Array<{ ref: ReferenceForProvider<T>; message: string }>;
}

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

  abstract getSecretValue(
    _ref: ReferenceForProvider<T>
  ): Promise<ValueForProvider<T> | null>;

  abstract getSecretValues(
    _refs: ReferenceForProvider<T>[]
  ): Promise<GetSecretValuesResult<T>>;

  abstract setSecret(_value: ValueForProvider<T>): Promise<void>;

  abstract setSecrets(
    _entries: Array<{
      value: ValueForProvider<T>;
    }>
  ): Promise<void>;

  abstract removeSecret(_ref: ReferenceForProvider<T>): Promise<void>;

  abstract removeSecrets(_refs: ReferenceForProvider<T>[]): Promise<void>;

  abstract listAllSecrets(): Promise<(ValueForProvider<T>)[]>;

  static validateConfig(config: any): boolean {
    // Base implementation rejects all configs as a fail-safe.
    // Provider implementations must override with specific validation.
    if (!config) {
      return false;
    }

    return false;
  }
}
