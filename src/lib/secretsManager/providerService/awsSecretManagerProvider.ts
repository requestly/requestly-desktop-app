import { AbstractSecretProvider } from "./ISecretProvider";
import {
  AWSSecretsManagerConfig,
  SecretProviderConfig,
  SecretProviderType,
  SecretReference,
} from "../types";
import { SecretsCacheService } from "../cacheService";

// Functions
// 1. validate config
// 2. test connection
// 3. fetch secret
// 4. list secrets

export class AWSSecretsManagerProvider extends AbstractSecretProvider {
  readonly type = SecretProviderType.AWS_SECRETS_MANAGER;

  readonly id: string;


  protected config: AWSSecretsManagerConfig;

  protected cacheService: SecretsCacheService;

  // { type: "aws"; nameOrArn: string; versionId?: string; versionStage?: string }
  protected getSecretIdentfier(ref: AwsReference): string {
    return `name=${this.nameOrArn};version:${ref.version}`;
  }

  constructor(
    providerConfig: SecretProviderConfig,
    cacheService: SecretsCacheService
  ) {
    super();
    this.id = providerConfig.id;
    this.config = providerConfig.config as AWSSecretsManagerConfig;
    this.cacheService = cacheService;
  }

  static validateConfig(config: AWSSecretsManagerConfig): boolean {
    return Boolean(
      config.accessKeyId && config.secretAccessKey && config.region
    );
  }

  async testConnection(): Promise<boolean> {
    if (!AWSSecretsManagerProvider.validateConfig(this.config)) {
      return false;
    }

    return true;
  }

  async fetchSecret(ref: SecretReference): Promise<string> {}

  async listSecrets(): Promise<string[]> {}
}
