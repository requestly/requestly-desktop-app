import { SecretProviderConfig, SecretProviderType } from "../types";
import { ISecretProvider } from "./ISecretProvider";
import { AWSSecretsManagerProvider } from "./awsSecretManagerProvider";

export function createProvider(config: SecretProviderConfig): ISecretProvider {
  switch (config.type) {
    case SecretProviderType.AWS_SECRETS_MANAGER:
      return new AWSSecretsManagerProvider(config);
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

