import { SecretProviderConfig, SecretProviderType } from "../types";
import { AbstractEncryptedStorage } from "../encryptedStorage/AbstractEncryptedStorage";
import { AbstractSecretProvider } from "../providerService/AbstractSecretProvider";

type ProviderManifestItem = {
  id: string;
  type: SecretProviderType;
};

export type ProviderManifest = ProviderManifestItem[];

export abstract class AbstractProviderRegistry {
  protected encryptedStorage: AbstractEncryptedStorage;

  protected providers: Map<string, AbstractSecretProvider> = new Map();

  constructor(encryptedStorage: AbstractEncryptedStorage) {
    this.encryptedStorage = encryptedStorage;
  }

  abstract initialize(): Promise<void>;

  protected abstract loadManifest(): Promise<ProviderManifest>;

  protected abstract saveManifest(manifest: ProviderManifest): Promise<void>;

  abstract getAllProviderConfigs(): Promise<SecretProviderConfig[]>;

  abstract getProviderConfig(id: string): Promise<SecretProviderConfig | null>;

  abstract setProviderConfig(config: SecretProviderConfig): Promise<void>;

  abstract deleteProviderConfig(id: string): Promise<void>;

  abstract getProvider(providerId: string): AbstractSecretProvider | null;
}
