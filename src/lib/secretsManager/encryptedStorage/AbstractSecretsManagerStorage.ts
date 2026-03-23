import { SecretProviderConfig, SecretValue } from "../types";

export type ProviderStorageChangeCallback = (
  providers: Record<string, SecretProviderConfig>
) => void;
export type SecretStorageChangeCallback = (
  secrets: Record<string, SecretValue>
) => void;

export abstract class AbstractSecretsManagerStorage {
  abstract setProviderConfig(
    _providerId: string,
    _data: SecretProviderConfig
  ): Promise<void>;
  abstract setSecretValue(_secretId: string, _data: SecretValue): Promise<void>;
  abstract setSecretValues(
    _entries: Record<string, SecretValue>
  ): Promise<void>;

  abstract getProviderConfig(
    _providerId: string
  ): Promise<SecretProviderConfig | null>;
  abstract getSecretValue(_secretId: string): Promise<SecretValue | null>;

  abstract getAllProviderConfigs(): Promise<SecretProviderConfig[]>;
  abstract getAllSecretValues(): Promise<SecretValue[]>;
  abstract deleteProviderConfig(_providerId: string): Promise<void>;
  abstract deleteSecretValue(_secretId: string): Promise<void>;
  abstract deleteSecretValues(_keys: string[]): Promise<void>;

  abstract onProvidersChange(
    callback: ProviderStorageChangeCallback
  ): () => void;
  abstract onSecretsChange(callback: SecretStorageChangeCallback): () => void;
}
