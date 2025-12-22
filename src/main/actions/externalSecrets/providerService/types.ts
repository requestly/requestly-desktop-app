export enum SecretProviderType {
  AWS_SECRETS_MANGER = "aws",
}

export interface AWSSecretsManagerConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface SecretProviderMetadata {
  id: string;
  type: SecretProviderType;
  name: string;
  isConfigured: boolean;
  createdAt: number;
  updatedAt: number;
}

export type SecretProviderConfig = AWSSecretsManagerConfig;

export interface ISecretProvider {
  type: SecretProviderType;
  id: string;

  configure(config: SecretProviderConfig): Promise<void>;
  getConfig(id: string): Promise<SecretProviderConfig>; // should return all or any non-sentive metadata? sensitive data is lazily fetched

  testConnection(): Promise<boolean>;
  fetchSecret(secretName: string): Promise<string>;
}
