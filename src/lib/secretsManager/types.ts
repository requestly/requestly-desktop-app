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

export interface SecretReference {
  identifier: string;
  version?: string;
  key?: string;
}

/**
 *
 * type SecretReference =
 *   | { type: "aws"; nameOrArn: string; versionId?: string; versionStage?: string }
 *   | { type: "vault"; path: string; version?: number; key?: string };
 */


export interface CachedSecret {
  id: string; // Unique identifier
  identifier: string; // Secret identifier (name, ARN, or path)
  value: string; // The actual secret value
  providerId: string;
  providerType: SecretProviderType;
  fetchedAt: number;
  expiresAt: number;
  version?: string;
}
