import { SecretProviderConfig, SecretProviderType } from "../types";
import { AbstractSecretsManagerStorage } from "../encryptedStorage/AbstractSecretsManagerStorage";
import { AWSSecretsManagerProvider } from "./awsSecretManagerProvider";
import { AbstractSecretProvider } from "./AbstractSecretProvider";

export function createProviderInstance(
  config: SecretProviderConfig,
  store: AbstractSecretsManagerStorage
): AbstractSecretProvider<SecretProviderType> {
  switch (config.type) {
    case SecretProviderType.AWS_SECRETS_MANAGER: {
      return new AWSSecretsManagerProvider(config, store);
    }

    default: {
      // Exhaustiveness check - TypeScript will error if we miss a case
      throw new Error(`Unknown provider type: ${(config as any).type}`);
    }
  }
}
