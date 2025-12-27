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
  createdAt: number;
  updatedAt: number;
  config: AWSSecretsManagerConfig;
}
