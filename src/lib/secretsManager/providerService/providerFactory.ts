import { SecretProviderConfig, SecretProviderType } from "../types";
import { AWSSecretsManagerProvider } from "./awsSecretManagerProvider";
import { AbstractSecretProvider } from "./AbstractSecretProvider";

export function createProviderInstance(
  config: SecretProviderConfig
): AbstractSecretProvider<SecretProviderType> {
  switch (config.type) {
    case SecretProviderType.AWS_SECRETS_MANAGER: {
      // TypeScript knows config is AWSSecretProviderConfig here
      return new AWSSecretsManagerProvider(config);
    }

    default: {
      // Exhaustiveness check - TypeScript will error if we miss a case
      throw new Error(`Unknown provider type: ${(config as any).type}`);
    }
  }
}
