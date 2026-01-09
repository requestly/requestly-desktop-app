// filepath: /Users/nafeesn/requestly/requestly-desktop-app/src/lib/secretsManager/providerRegistry/IProviderRegistry.ts
import { SecretProviderConfig } from "../types";
import { IEncryptedStorage } from "../encryptedStorage/IEncryptedStorage";

export interface IProviderRegistry {
  initialize(): Promise<void>;
  listProviders(): Promise<string[]>;
  loadAllProviderConfigs(): Promise<SecretProviderConfig[]>;
  saveProviderConfig(config: SecretProviderConfig): Promise<void>;
  deleteProviderConfig(id: string): Promise<void>;
  getProviderConfig(id: string): Promise<SecretProviderConfig | null>;
}

export abstract class AbstractProviderRegistry implements IProviderRegistry {
  protected encryptedStorage: IEncryptedStorage

  constructor(encryptedStorage: IEncryptedStorage) {
    this.encryptedStorage = encryptedStorage;
  }

  abstract initialize(): Promise<void>;

  abstract listProviders(): Promise<string[]>;

  abstract loadAllProviderConfigs(): Promise<SecretProviderConfig[]>;

  abstract saveProviderConfig(config: SecretProviderConfig): Promise<void>;

  abstract deleteProviderConfig(id: string): Promise<void>;

  abstract getProviderConfig(id: string): Promise<SecretProviderConfig | null>;
}
