import {
  SecretsManagerClient,
  GetSecretValueCommand,
  ListSecretsCommand,
} from "@aws-sdk/client-secrets-manager";
import {
  AWSSecretsManagerConfig,
  ISecretProvider,
  SecretProviderConfig,
  SecretProviderMetadata,
  SecretProviderType,
} from "./types";

export class AWSSecretsManagerProvider implements ISecretProvider {
  readonly type = SecretProviderType.AWS_SECRETS_MANGER;

  // Provider instance holds its own identity
  constructor(public readonly id: string) {}

  private config: AWSSecretsManagerConfig | null = null;
  private client: SecretsManagerClient | null = null;

  async configure(config: AWSSecretsManagerConfig): Promise<void> {
    // Validate
    this.validateConfig(config);

    // Create AWS client
    this.client = new SecretsManagerClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    // Test connection ?? IS this needed
    // await this.testConnection();

    // Store config
    this.config = config;
  }

  /**
   * Get non-sensitive metadata
   */
  getConfig(): Promise<SecretProviderConfig> {
    // Fetch and return metadata
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error("Client not initialized");
    }

    try {
      await this.client.send(new ListSecretsCommand({ MaxResults: 1 }));
      return true;
    } catch (error: any) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Fetch secret
   */
  async fetchSecret(secretName: string): Promise<string> {
    if (!this.client) {
      throw new Error("Provider not configured");
    }

    const result = await this.client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );

    return (
      result.SecretString || Buffer.from(result.SecretBinary!).toString("utf-8")
    );
  }

  /**
   * List secrets (for autocomplete)
   */
  async listSecrets(prefix?: string): Promise<string[]> {
    if (!this.client) {
      throw new Error("Provider not configured");
    }

    // TODO: learn about prefix

    const result = await this.client.send(
      new ListSecretsCommand({
        Filters: prefix ? [{ Key: "name", Values: [prefix] }] : undefined,
      })
    );

    return result.SecretList?.map((s) => s.Name!) || [];
  }
  async disconnect(): Promise<void> {
    this.client?.destroy();
    this.client = null;
  }

  private validateConfig(config: AWSSecretsManagerConfig): void {
    if (!config.accessKeyId || !config.secretAccessKey || !config.region) {
      throw new Error("Missing required fields");
    }
  }
}
