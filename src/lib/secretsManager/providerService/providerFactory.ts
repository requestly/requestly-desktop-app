import { SecretProviderConfig, SecretProviderType } from "../types";
import {
  AWSSecretsManagerProvider,
  AWSSecretProviderConfig,
} from "./awsSecretManagerProvider";
import {
  HashicorpVaultProvider,
  HashicorpVaultProviderConfig,
} from "./hashicorpVaultProvider";
import { AbstractSecretProvider } from "./AbstractSecretProvider";

/**
 * Type-safe provider factory that creates the appropriate provider instance
 * based on the configuration type.
 * 
 * TypeScript will narrow the config type within each case, ensuring type safety.
 */
export function createProviderInstance(
  config: SecretProviderConfig
): AbstractSecretProvider<SecretProviderType> {
  switch (config.type) {
    case SecretProviderType.AWS_SECRETS_MANAGER: {
      // TypeScript knows config is AWSSecretProviderConfig here
      return new AWSSecretsManagerProvider(config);
    }
    case SecretProviderType.HASHICORP_VAULT: {
      // TypeScript knows config is HashicorpVaultProviderConfig here
      return new HashicorpVaultProvider(config);
    }
    default: {
      // Exhaustiveness check - TypeScript will error if we miss a case
      const _exhaustive: never = config;
      throw new Error(`Unknown provider type: ${(_exhaustive as any).type}`);
    }
  }
}

