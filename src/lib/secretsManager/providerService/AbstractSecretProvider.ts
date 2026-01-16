/* eslint-disable no-unused-vars */
import { SecretProviderType, SecretReference, SecretValue } from "../types";

export abstract class AbstractSecretProvider {
  protected cache: Map<string, SecretValue> = new Map();

  abstract readonly type: SecretProviderType;

  abstract readonly id: string;

  protected config: any;

  protected abstract getCacheKey(ref: SecretReference): string;

  abstract testConnection(): Promise<boolean>;

  abstract getSecret(ref: SecretReference): Promise<SecretValue | null>;

  abstract getSecrets(refs: SecretReference[]): Promise<(SecretValue | null)[]>;

  abstract setSecret(): Promise<void>;

  abstract setSecrets(): Promise<void>;

  abstract removeSecret(): Promise<void>;

  abstract removeSecrets(): Promise<void>;

  protected invalidateCache(): void {
    this.cache.clear();
  }

  abstract refreshSecrets(): Promise<(SecretValue | null)[]>;

  static validateConfig(config: any): boolean {
    // Base implementation rejects all configs as a fail-safe.
    // Provider implementations must override with specific validation.
    if (!config) {
      return false;
    }

    return false;
  }
}
