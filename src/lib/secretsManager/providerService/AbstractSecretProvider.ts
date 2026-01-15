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

  abstract getSecrets(ref: SecretReference[]): Promise<SecretValue[]>;

  abstract setSecret(): Promise<void>;

  abstract setSecrets(): Promise<void>;

  static validateConfig(config: any): boolean {
    if (!config) {
      return false;
    }

    return false;
  }
}
