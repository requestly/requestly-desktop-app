/* eslint-disable no-continue */
/* eslint-disable class-methods-use-this */
import {
  AwsSecretReference,
  AWSSecretsManagerConfig,
  AwsSecretValue,
  SecretProviderConfig,
  SecretProviderType,
} from "../types";
import { AbstractSecretProvider } from "./AbstractSecretProvider";
import {
  BatchGetSecretValueCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class AWSSecretsManagerProvider extends AbstractSecretProvider {
  readonly type = SecretProviderType.AWS_SECRETS_MANAGER;

  readonly id: string;

  protected config: AWSSecretsManagerConfig;

  protected cache: Map<string, AwsSecretValue> = new Map();

  private client: SecretsManagerClient;

  constructor(providerConfig: SecretProviderConfig) {
    super();
    this.id = providerConfig.id;
    this.config = providerConfig.config as AWSSecretsManagerConfig;
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
    return `name=${ref.nameOrArn};version:${ref.version}`;
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
    const cachedSecret = this.cache.get(cacheKey);
    const now = Date.now();

    if (cachedSecret && cachedSecret.fetchedAt + DEFAULT_CACHE_TTL_MS > now) {
      return cachedSecret;
    }

    const getSecretCommand = new GetSecretValueCommand({
      SecretId: ref.nameOrArn,
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
      providerId: this.id,
      secretReference: ref,
      fetchedAt: Date.now(),
      name: secretResponse.Name,
      value: secretResponse.SecretString,
      ARN: secretResponse.ARN,
      versionId: secretResponse.VersionId,
    };

    this.cache.set(cacheKey, awsSecret);

    return awsSecret;
  }

  async getSecrets(refs: AwsSecretReference[]): Promise<AwsSecretValue[]> {
    if (!this.client) {
      throw new Error("AWS Secrets Manager client is not initialized.");
    }

    const cacheHits: AwsSecretReference[] = [];
    const cacheMisses: AwsSecretReference[] = [];
    const awsSecrets: AwsSecretValue[] = [];

    for (const ref of refs) {
      const cacheKey = this.getCacheKey(ref);
      const cached = this.cache.get(cacheKey);
      const now = Date.now();

      if (cached && cached.fetchedAt + DEFAULT_CACHE_TTL_MS > now) {
        cacheHits.push(ref);
        awsSecrets.push(cached);
      } else {
        cacheMisses.push(ref);
      }
    }

    if (cacheMisses.length === 0) {
      return awsSecrets;
    }

    try {
      const batchGetCommand = new BatchGetSecretValueCommand({
        SecretIdList: cacheMisses.map((ref) => ref.nameOrArn),
      });

      const response = await this.client.send(batchGetCommand);

      if (response.$metadata.httpStatusCode !== 200) {
        console.error("!!!debug", "Failed to fetch secrets", response);
        return awsSecrets;
      }

      if (response.SecretValues) {
        for (const secretResponse of response.SecretValues) {
          if (!secretResponse.Name || !secretResponse.SecretString) {
            console.error(
              "!!!debug",
              "Invalid secret response",
              secretResponse
            );
            continue;
          }

          const ref = cacheMisses.find(
            (r) =>
              r.nameOrArn === secretResponse.Name ||
              r.nameOrArn === secretResponse.ARN
          );

          if (!ref) {
            continue;
          }

          const awsSecret: AwsSecretValue = {
            providerId: this.id,
            secretReference: ref,
            fetchedAt: Date.now(),
            name: secretResponse.Name,
            value: secretResponse.SecretString,
            ARN: secretResponse.ARN,
            versionId: secretResponse.VersionId,
          };

          const cacheKey = this.getCacheKey(ref);
          this.cache.set(cacheKey, awsSecret);
          awsSecrets.push(awsSecret);
        }
      }
    } catch (err) {
      console.error("!!!debug", "Error fetching secrets in batch", err);
      return awsSecrets;
    }

    return awsSecrets;
  }

  async setSecret(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async setSecrets(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  static validateConfig(config: AWSSecretsManagerConfig): boolean {
    return Boolean(
      config.accessKeyId && config.secretAccessKey && config.region
    );
  }
}
