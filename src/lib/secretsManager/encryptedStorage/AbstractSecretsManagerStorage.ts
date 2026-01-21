import { SecretProviderConfig } from "../types";

export abstract class AbstractSecretsManagerStorage {
  abstract set(_key: string, _data: SecretProviderConfig): Promise<void>;

  abstract get(_key: string): Promise<SecretProviderConfig | null>;

  abstract getAll(): Promise<SecretProviderConfig[]>;

  abstract delete(_key: string): Promise<void>;
}
