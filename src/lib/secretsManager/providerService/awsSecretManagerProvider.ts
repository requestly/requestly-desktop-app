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
    return `${this.id}:name:${ref.identifier};version:${
      ref.version ?? "latest"
    }`;
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

  async getSecret(ref: AwsSecretReference): Promise<AwsSecretValue | null> {
    if (!this.client) {
      throw new Error("AWS Secrets Manager client is not initialized.");
    }

    const storageKey = this.getStorageKey(ref);
    const persisted = await this.getPersistedSecret(storageKey);

    if (persisted) {
      return persisted as AwsSecretValue;
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

    await this.persistSecret(storageKey, awsSecret);

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

  async setSecret(value: AwsSecretValue): Promise<void> {
    await this.persistSecret(this.getStorageKey(value.secretReference), value);
  }

  async setSecrets(entries: Array<{ value: AwsSecretValue }>): Promise<void> {
    const toSet: Record<string, AwsSecretValue> = {};
    for (const entry of entries) {
      toSet[this.getStorageKey(entry.value.secretReference)] = entry.value;
    }
    await this.persistSecrets(toSet);
  }

  async removeSecret(ref: AwsSecretReference): Promise<void> {
    await this.deletePersistedSecret(this.getStorageKey(ref));
  }

  async removeSecrets(refs: AwsSecretReference[]): Promise<void> {
    await this.deletePersistedSecrets(
      refs.map((ref) => this.getStorageKey(ref))
    );
  }

  async refreshSecrets(): Promise<(AwsSecretValue | null)[]> {
    const allSecrets = await this.store.getAllSecretValues();
    const providerSecrets = allSecrets.filter(
      (s) => s.providerId === this.id
    ) as AwsSecretValue[];

    await this.deletePersistedSecrets(
      providerSecrets.map((s) => this.getStorageKey(s.secretReference))
    );

    return this.getSecrets(providerSecrets.map((s) => s.secretReference));
  }

  static validateConfig(config: AWSSecretsManagerCredentials): boolean {
    return Boolean(
      config.accessKeyId && config.secretAccessKey && config.region
    );
  }
}
