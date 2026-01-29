import { SecretsManagerEncryptedStorage } from "./encryptedStorage/SecretsManagerEncryptedStorage";
import { FileBasedProviderRegistry } from "./providerRegistry/FileBasedProviderRegistry";
import { ProviderChangeCallback } from "./providerRegistry/AbstractProviderRegistry";
import { SecretsManager } from "./secretsManager";
import { SecretProviderConfig, SecretReference, SecretValue } from "./types";
import {
  createSecretsError,
  SecretsErrorCode,
  SecretsResultPromise,
} from "./errors";

const getSecretsManager = (): SecretsManager => {
  if (!SecretsManager.isInitialized()) {
    return null as any;
  }
  return SecretsManager.getInstance();
};

const PROVIDERS_DIRECTORY = "providers";

export const initSecretsManager = async (): SecretsResultPromise<void> => {
  try {
    const secretsStorage = new SecretsManagerEncryptedStorage(
      PROVIDERS_DIRECTORY
    );
    const registry = new FileBasedProviderRegistry(secretsStorage);

    await SecretsManager.initialize(registry);

    return {
      type: "success",
    };
  } catch (error) {
    if ((error as Error).name === "SafeStorageEncryptionNotAvailable") {
      return createSecretsError(
        SecretsErrorCode.SAFE_STORAGE_ENCRYPTION_NOT_AVAILABLE,
        "Safe storage encryption is not available.",
        {
          cause: error as Error,
        }
      );
    }

    return createSecretsError(
      SecretsErrorCode.UNKNOWN,
      "Failed to initialize SecretsManager.",
      {
        cause: error as Error,
      }
    );
  }
};

export const subscribeToProvidersChange = (
  callback: ProviderChangeCallback
): (() => void) => {
  return getSecretsManager().onProvidersChange(callback);
};

export const setSecretProviderConfig = async (
  config: SecretProviderConfig
): SecretsResultPromise<void> => {
  return getSecretsManager().setProviderConfig(config);
};

export const removeSecretProviderConfig = async (
  providerId: string
): SecretsResultPromise<void> => {
  return getSecretsManager().removeProviderConfig(providerId);
};

export const getSecretProviderConfig = async (
  providerId: string
): SecretsResultPromise<SecretProviderConfig | null> => {
  return getSecretsManager().getProviderConfig(providerId);
};

export const testSecretProviderConnection = async (
  providerId: string
): SecretsResultPromise<boolean> => {
  return getSecretsManager().testProviderConnection(providerId);
};

export const getSecretValue = async (
  providerId: string,
  ref: SecretReference
): SecretsResultPromise<SecretValue | null> => {
  return getSecretsManager().getSecret(providerId, ref);
};

export const getSecretValues = async (
  secrets: Array<{ providerId: string; ref: SecretReference }>
): SecretsResultPromise<SecretValue[]> => {
  return getSecretsManager().getSecrets(secrets);
};

export const refreshSecrets = async (
  providerId: string
): SecretsResultPromise<(SecretValue | null)[]> => {
  return getSecretsManager().refreshSecrets(providerId);
};

export const listSecretProviders = async (): SecretsResultPromise<
  Omit<SecretProviderConfig, "config">[]
> => {
  return getSecretsManager().listProviders();
};
