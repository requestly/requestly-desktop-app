import { GetSecretValueCommandOutput } from "@aws-sdk/client-secrets-manager";

export enum SecretProviderType {
  AWS_SECRETS_MANAGER = "aws",
}

export interface AWSSecretsManagerConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export type ProviderSpecificConfig = AWSSecretsManagerConfig; // | HashicorpVaultConfig | OtherProviderConfig;

export interface SecretProviderConfig {
  id: string;
  type: SecretProviderType;
  name: string;
  createdAt: number;
  updatedAt: number;
  config: ProviderSpecificConfig;
}

export type AwsSecretReference = {
  type: SecretProviderType.AWS_SECRETS_MANAGER;
  nameOrArn: string;
  version?: string;
};

export type SecretReference = AwsSecretReference; // | VaultSecretReference; // | OtherProviderSecretReference;

// export interface CachedSecret {
//   cacheKey: string; // Unique identifier
//   identifier: string; // Secret identifier (name, ARN, or path)
//   secretReference: SecretReference;
//   value: string; // The actual secret value
//   fetchedAt: number;
// }

interface BaseSecretValue {
  providerId: string;
  secretReference: SecretReference;
  fetchedAt: number;
}

export interface AwsSecretValue extends BaseSecretValue {
  name: GetSecretValueCommandOutput["Name"];
  value: GetSecretValueCommandOutput["SecretString"];
  ARN: GetSecretValueCommandOutput["ARN"];
  versionId: GetSecretValueCommandOutput["VersionId"];
}

export type SecretValue = AwsSecretValue; // | VaultSecretValue; // | OtherProviderSecretValue;
