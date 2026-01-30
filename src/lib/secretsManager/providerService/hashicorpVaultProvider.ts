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
  path: string;
  version?: number;
}

export interface VaultSecretValue {
  type: SecretProviderType.HASHICORP_VAULT;
  providerId: string;
  secretReference: VaultSecretReference;
  fetchedAt: number;
  path: string;
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
    super();
    this.id = providerConfig.id;
    this.config = providerConfig.credentials;
  }

  protected getCacheKey(ref: VaultSecretReference): string {
    return `path:${ref.path};version:${ref.version ?? "latest"}`;
  }

  async testConnection(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  async getSecret(_ref: VaultSecretReference): Promise<VaultSecretValue | null> {
    throw new Error("Method not implemented.");
  }

  async getSecrets(_refs: VaultSecretReference[]): Promise<(VaultSecretValue | null)[]> {
    throw new Error("Method not implemented.");
  }

  async setSecret(
    _ref: VaultSecretReference,
    _value: string | Record<string, any>
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async setSecrets(
    _entries: Array<{ ref: VaultSecretReference; value: string | Record<string, any> }>
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async removeSecret(_ref: VaultSecretReference): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async removeSecrets(_refs: VaultSecretReference[]): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async refreshSecrets(): Promise<(VaultSecretValue | null)[]> {
    throw new Error("Method not implemented.");
  }

  static validateConfig(config: HashicorpVaultCredentials): boolean {
    return Boolean(config.address);
  }
}
