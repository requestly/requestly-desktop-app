import { CachedSecret, SecretProviderType, SecretReference } from "../types";

export abstract class AbstractSecretProvider {
  protected cache: Map<string, CachedSecret> = new Map();

  abstract getSecretIdentfier(ref: SecretReference): string;

  abstract readonly type: SecretProviderType;

  abstract readonly id: string;

  protected config: any;

  abstract testConnection(): Promise<boolean>;

  abstract getSecret(ref: SecretReference): Promise<string>;

  abstract getSecrets(): Promise<string[]>;

  abstract setSecret(): Promise<void>;

  abstract setSecrets(): Promise<void>;

  static validateConfig(config: any): boolean {
    throw new Error("Not implemented");
  }
}
