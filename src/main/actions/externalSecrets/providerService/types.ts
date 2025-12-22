export enum SecretProviderType {
  AWS_SECRETS_MANGER = "aws",
}

export interface AWSSecretsManagerConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export interface SecretProviderConfig {
  id: string;
  type: SecretProviderType;
  name: string;
  isConfigured: boolean;
  createdAt: number;
  updatedAt: number;
  config: AWSSecretsManagerConfig;
}

export interface ISecretProvider {
  type: SecretProviderType;
  id: string;

  testConnection(): Promise<boolean>;
  fetchSecret(secretName: string): Promise<string>;
  listSecrets(): Promise<string[]>;
}
