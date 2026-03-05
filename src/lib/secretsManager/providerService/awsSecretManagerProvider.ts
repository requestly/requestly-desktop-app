import {
  SecretProviderType,
  ProviderConfig,
  SecretReference,
} from "../baseTypes";
import { AbstractSecretProvider } from "./AbstractSecretProvider";
import { AbstractSecretsManagerStorage } from "../encryptedStorage/AbstractSecretsManagerStorage";
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

export interface AwsSecretReference
  extends SecretReference<SecretProviderType.AWS_SECRETS_MANAGER> {
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

  constructor(
    providerConfig: AWSSecretProviderConfig,
    store: AbstractSecretsManagerStorage
  ) {
    super(store);
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

  protected getStorageKey(ref: AwsSecretReference): string {
    return `${this.id}:${ref.id}`;
  }

  async testConnection(): Promise<boolean> {
    if (!AWSSecretsManagerProvider.validateConfig(this.config)) {
      return false;
    }

    const listSecretsCommand = new ListSecretsCommand({ MaxResults: 1 });
    const res = await this.client.send(listSecretsCommand);

    if (res.$metadata.httpStatusCode !== 200) {
      return false;
    }

    return true;
  }

  async getSecretValue(ref: AwsSecretReference): Promise<AwsSecretValue | null> {
    if (!this.client) {
      throw new Error("AWS Secrets Manager client is not initialized.");
    }

    const getSecretCommand = new GetSecretValueCommand({
      SecretId: ref.identifier,
      VersionId: ref.version,
    });

    const secretResponse = await this.client.send(getSecretCommand);

    if (secretResponse.$metadata.httpStatusCode !== 200) {
      throw new Error("Failed to fetch secret from AWS Secrets Manager.");
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

    return awsSecret;
  }

  async getSecretValues(
    refs: AwsSecretReference[]
  ): Promise<{ results: (AwsSecretValue | null)[]; errors: Array<{ ref: AwsSecretReference; message: string }> }> {
    if (!this.client) {
      throw new Error("AWS Secrets Manager client is not initialized.");
    }

    const settled = await Promise.allSettled(refs.map((ref) => this.getSecretValue(ref)));
    const results: (AwsSecretValue | null)[] = [];
    const errors: Array<{ ref: AwsSecretReference; message: string }> = [];

    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        results.push(null);
        errors.push({
          ref: refs[i],
          message: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    }

    return { results, errors };
  }

  // upserts a secret in the store
  async setSecret(value: AwsSecretValue): Promise<void> {
    await this.store.setSecretValue(this.getStorageKey(value.secretReference), value);
  }

  // removes and sets all the secrets for the provider
  async setSecrets(entries: Array<{ value: AwsSecretValue }>): Promise<void> {
    const allSecrets = await this.listAllSecrets();

    const toRemove = allSecrets.map((s) => this.getStorageKey(s.secretReference));

    await this.store.deleteSecretValues(toRemove);

    const toSet: Record<string, AwsSecretValue> = {};
    for (const entry of entries) {
      toSet[this.getStorageKey(entry.value.secretReference)] = entry.value;
    }
    await this.store.setSecretValues(toSet);
  }

  async removeSecret(ref: AwsSecretReference): Promise<void> {
    await this.store.deleteSecretValue(this.getStorageKey(ref));
  }

  async removeSecrets(refs: AwsSecretReference[]): Promise<void> {
    await this.store.deleteSecretValues(
      refs.map((ref) => this.getStorageKey(ref))
    );
  }

  async listAllSecrets(): Promise<(AwsSecretValue)[]> {
    const allSecrets = await this.store.getAllSecretValues();
    const providerSecrets = allSecrets.filter(
      (s) => s.providerId === this.id
    ) as AwsSecretValue[];

    return providerSecrets;
  }

  static validateConfig(config: AWSSecretsManagerCredentials): boolean {
    return Boolean(
      config.accessKeyId && config.secretAccessKey && config.region
    );
  }
}
