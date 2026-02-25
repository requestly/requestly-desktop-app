import { SecretProviderType, ProviderConfig, SecretReference } from "../baseTypes";
import { AbstractSecretProvider } from "./AbstractSecretProvider";
import {
  GetSecretValueCommand,
  GetSecretValueCommandOutput,
  ListSecretsCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

export interface AWSSecretsManagerCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export type AWSSecretProviderConfig = ProviderConfig<
  SecretProviderType.AWS_SECRETS_MANAGER,
  AWSSecretsManagerCredentials
>;

export interface AwsSecretReference extends SecretReference<SecretProviderType.AWS_SECRETS_MANAGER> {
  identifier: string;
  version?: string;
}

export interface AwsSecretValue {
  type: SecretProviderType.AWS_SECRETS_MANAGER;
  providerId: string;
  secretReference: AwsSecretReference;
  fetchedAt: number;
  name: GetSecretValueCommandOutput["Name"];
  value: GetSecretValueCommandOutput["SecretString"];
  ARN: GetSecretValueCommandOutput["ARN"];
  versionId: GetSecretValueCommandOutput["VersionId"];
}

export class AWSSecretsManagerProvider extends AbstractSecretProvider<SecretProviderType.AWS_SECRETS_MANAGER> {
  readonly type = SecretProviderType.AWS_SECRETS_MANAGER as const;

  readonly id: string;

  protected config: AWSSecretsManagerCredentials;

  private client: SecretsManagerClient;

  constructor(providerConfig: AWSSecretProviderConfig) {
    super();
    this.id = providerConfig.id;
    this.config = providerConfig.credentials;
    this.client = new SecretsManagerClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        sessionToken: this.config.sessionToken,
      },
    });
  }

  protected getCacheKey(ref: AwsSecretReference): string {
    return `name:${ref.identifier};version:${ref.version ?? "latest"}`;
  }

  async testConnection(): Promise<boolean> {
    if (!AWSSecretsManagerProvider.validateConfig(this.config)) {
      return false;
    }

    try {
      const listSecretsCommand = new ListSecretsCommand({ MaxResults: 1 });
      const res = await this.client.send(listSecretsCommand);
      console.log("!!!debug", "aws result", res);

      if (res.$metadata.httpStatusCode !== 200) {
        return false;
      }

      return true;
    } catch (err) {
      console.error(
        "!!!debug",
        "aws secrets manager test connection error",
        err
      );
      return false;
    }
  }

  async getSecret(ref: AwsSecretReference): Promise<AwsSecretValue | null> {
    if (!this.client) {
      throw new Error("AWS Secrets Manager client is not initialized.");
    }

    const cacheKey = this.getCacheKey(ref);
    const cachedSecret = this.getCachedSecret(cacheKey) as AwsSecretValue | null;

    if (cachedSecret) {
      console.log("!!!debug", "returning from cache", cachedSecret);
      return cachedSecret;
    }

    const getSecretCommand = new GetSecretValueCommand({
      SecretId: ref.identifier,
      VersionId: ref.version,
    });

    const secretResponse = await this.client.send(getSecretCommand);

    if (secretResponse.$metadata.httpStatusCode !== 200) {
      console.error("!!!debug", "Failed to fetch secret", secretResponse);
      return null;
    }

    if (!secretResponse.SecretString) {
      console.error("!!!debug", "SecretString is empty", secretResponse);
      return null;
    }

    const awsSecret: AwsSecretValue = {
      type: SecretProviderType.AWS_SECRETS_MANAGER,
      providerId: this.id,
      secretReference: ref,
      fetchedAt: Date.now(),
      name: secretResponse.Name,
      value: secretResponse.SecretString,
      ARN: secretResponse.ARN,
      versionId: secretResponse.VersionId,
    };

    console.log("!!!debug", "returning after fetching", awsSecret);

    this.setCacheEntry(cacheKey, awsSecret);

    return awsSecret;
  }

  async getSecrets(
    refs: AwsSecretReference[]
  ): Promise<(AwsSecretValue | null)[]> {
    if (!this.client) {
      throw new Error("AWS Secrets Manager client is not initialized.");
    }

    // Not using BatchGetSecretValueCommand as it would require additional permissions
    return Promise.all(refs.map((ref) => this.getSecret(ref)));
  }

  async setSecret(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async setSecrets(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async removeSecret(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async removeSecrets(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async refreshSecrets(): Promise<(AwsSecretValue | null)[]> {
    const allSecretRefs = Array.from(this.cache.values()).map(
      (secret) => secret.secretReference
    );

    this.invalidateCache();

    return this.getSecrets(allSecretRefs);
  }

  static validateConfig(config: AWSSecretsManagerCredentials): boolean {
    return Boolean(
      config.accessKeyId && config.secretAccessKey && config.region
    );
  }
}
