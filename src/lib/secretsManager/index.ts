import { SecretsManagerEncryptedStorage } from "./encryptedStorage/SecretsManagerEncryptedStorage";
import { FileBasedProviderRegistry } from "./providerRegistry/FileBasedProviderRegistry";
import { ProviderChangeCallback } from "./providerRegistry/AbstractProviderRegistry";
import { SecretsManager } from "./secretsManager";
import { SecretProviderConfig, SecretReference, SecretValue } from "./types";
import { SecretsResultPromise } from "./errors";

const getSecretsManager = (): SecretsManager => {
  if (!SecretsManager.isInitialized()) {
    return null as any;
  }
  return SecretsManager.getInstance();
};

const PROVIDERS_DIRECTORY = "providers";

export const initSecretsManager = async () => {
  const secretsStorage = new SecretsManagerEncryptedStorage(
    PROVIDERS_DIRECTORY
  );
  const registry = new FileBasedProviderRegistry(secretsStorage);

  await SecretsManager.initialize(registry);
  console.log("!!!debug", "secretsManager initialized");
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
