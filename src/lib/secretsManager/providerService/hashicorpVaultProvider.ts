import { NoopSecretsManagerStorage } from "..";
import { SecretProviderType, ProviderConfig, SecretReference } from "../baseTypes";
import { AbstractSecretProvider } from "./AbstractSecretProvider";

export interface HashicorpVaultCredentials {
  address: string;
  token?: string;
  namespace?: string;
  apiVersion?: string;
}

export type HashicorpVaultProviderConfig = ProviderConfig<
  SecretProviderType.HASHICORP_VAULT,
  HashicorpVaultCredentials
>;

export interface VaultSecretReference extends SecretReference<SecretProviderType.HASHICORP_VAULT> {
  identifier: string;
  version?: number;
}

export interface VaultSecretValue {
  type: SecretProviderType.HASHICORP_VAULT;
  providerId: string;
  secretReference: VaultSecretReference;
  fetchedAt: number;
  identifier: string;
  data: Record<string, any>;
  metadata?: {
    version: number;
    created_time: string;
    deletion_time?: string;
    destroyed?: boolean;
  };
}

export class HashicorpVaultProvider extends AbstractSecretProvider<SecretProviderType.HASHICORP_VAULT> {
  readonly type = SecretProviderType.HASHICORP_VAULT as const;

  readonly id: string;

  protected config: HashicorpVaultCredentials;

  constructor(providerConfig: HashicorpVaultProviderConfig) {
    super(new NoopSecretsManagerStorage());
    this.id = providerConfig.id;
    this.config = providerConfig.credentials;
  }

  protected getStorageKey(ref: VaultSecretReference): string {
    return `${this.id}:${ref.id}`;
  }

  async testConnection(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  async getSecretValue(_ref: VaultSecretReference): Promise<VaultSecretValue | null> {
    throw new Error("Method not implemented.");
  }

  async getSecretValues(_refs: VaultSecretReference[]): Promise<{ results: (VaultSecretValue | null)[]; errors: Array<{ ref: VaultSecretReference; message: string }> }> {
    throw new Error("Method not implemented.");
  }

  async setSecret(
    _value: VaultSecretValue
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async setSecrets(
    _entries: Array<{ value: string | Record<string, any> }>
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async removeSecret(_ref: VaultSecretReference): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async removeSecrets(_refs: VaultSecretReference[]): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async listAllSecrets(): Promise<(VaultSecretValue)[]> {
    throw new Error("Method not implemented.");
  }

  static validateConfig(config: HashicorpVaultCredentials): boolean {
    return Boolean(config.address);
  }
}