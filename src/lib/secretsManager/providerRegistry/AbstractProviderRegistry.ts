import { SecretProviderConfig } from "../types";
import { AbstractSecretsManagerStorage } from "../encryptedStorage/AbstractSecretsManagerStorage";
import { AbstractSecretProvider } from "../providerService/AbstractSecretProvider";

export type ProviderChangeCallback = (
  configs: Omit<SecretProviderConfig, "config">[]
) => void;

export abstract class AbstractProviderRegistry {
  protected store: AbstractSecretsManagerStorage;

  protected providers: Map<string, AbstractSecretProvider> = new Map();

  constructor(store: AbstractSecretsManagerStorage) {
    this.store = store;
  }

  abstract initialize(): Promise<void>;

  abstract getAllProviderConfigs(): Promise<SecretProviderConfig[]>;

  abstract getProviderConfig(_id: string): Promise<SecretProviderConfig | null>;

  abstract setProviderConfig(_config: SecretProviderConfig): Promise<void>;

  abstract deleteProviderConfig(_id: string): Promise<void>;

  abstract getProvider(_providerId: string): AbstractSecretProvider | null;

  abstract onProvidersChange(_callback: ProviderChangeCallback): () => void;
}
