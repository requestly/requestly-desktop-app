import { SecretsManagerEncryptedStorage } from "./encryptedStorage/SecretsManagerEncryptedStorage";
import { FileBasedProviderRegistry } from "./providerRegistry/FileBasedProviderRegistry";
import { SecretsManager } from "./secretsManager";
import { SecretProviderConfig, SecretReference, SecretValue } from "./types";

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

export const setSecretProviderConfig = async (config: SecretProviderConfig) => {
  return getSecretsManager().setProviderConfig(config);
};

export const removeSecretProviderConfig = async (providerId: string) => {
  return getSecretsManager().removeProviderConfig(providerId);
};

export const getSecretProviderConfig = async (
  providerId: string
): Promise<SecretProviderConfig | null> => {
  return getSecretsManager().getProviderConfig(providerId);
};

export const testSecretProviderConnection = async (
  providerId: string
): Promise<boolean> => {
  return getSecretsManager().testProviderConnection(providerId);
};

export const getSecretValue = async (
  providerId: string,
  ref: SecretReference
): Promise<SecretValue | null> => {
  return getSecretsManager().getSecret(providerId, ref);
};

export const getSecretValues = async (
  secrets: Array<{ providerId: string; ref: SecretReference }>
): Promise<(SecretValue | null)[]> => {
  return getSecretsManager().getSecrets(secrets);
};

export const refreshSecrets = async (
  providerId: string
): Promise<(SecretValue | null)[]> => {
  return getSecretsManager().refreshSecrets(providerId);
};

export const listSecretProviders = async (): Promise<
  SecretProviderConfig[]
> => {
  return getSecretsManager().listProviders();
};
