import { SecretsManagerEncryptedStorage } from "./encryptedStorage/SecretsManagerEncryptedStorage";
import { FileBasedProviderRegistry } from "./providerRegistry/FileBasedProviderRegistry";
import { SecretsManager } from "./secretsManager";
import { SecretProviderConfig, SecretReference, SecretValue } from "./types";

const secretsManager = SecretsManager.getInstance();
const PROVIDERS_DIRECTORY = "providers";

export const initSecretsManager = async () => {
  const secretsStorage = new SecretsManagerEncryptedStorage(
    PROVIDERS_DIRECTORY
  );
  const registry = new FileBasedProviderRegistry(secretsStorage);

  await SecretsManager.initialize(registry);
};

export const setSecretProviderConfig = async (config: SecretProviderConfig) => {
  return secretsManager.setProviderConfig(config);
};

export const removeSecretProviderConfig = async (providerId: string) => {
  return secretsManager.removeProviderConfig(providerId);
};

export const getSecretProviderConfig = async (
  providerId: string
): Promise<SecretProviderConfig | null> => {
  return secretsManager.getProviderConfig(providerId);
};

export const testSecretProviderConnection = async (
  providerId: string
): Promise<boolean> => {
  return secretsManager.testProviderConnection(providerId);
};

export const getSecretValue = async (
  providerId: string,
  ref: SecretReference
): Promise<SecretValue | null> => {
  return secretsManager.getSecret(providerId, ref);
};

export const refreshSecrets = async (
  providerId: string
): Promise<(SecretValue | null)[]> => {
  return secretsManager.refreshSecrets(providerId);
};
