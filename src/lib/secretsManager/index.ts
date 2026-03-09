import { SecretsManagerEncryptedStorage } from "./encryptedStorage/SecretsManagerEncryptedStorage";
import {
  AbstractSecretsManagerStorage,
  ProviderStorageChangeCallback,
  SecretStorageChangeCallback,
} from "./encryptedStorage/AbstractSecretsManagerStorage";
import { FileBasedProviderRegistry } from "./providerRegistry/FileBasedProviderRegistry";
import { ProviderChangeCallback } from "./providerRegistry/AbstractProviderRegistry";
import { SecretsManager } from "./secretsManager";
import {
  SecretProviderConfig,
  SecretProviderMetadata,
  SecretReference,
  SecretValue,
} from "./types";
import {
  createSecretsError,
  SecretsErrorCode,
  SecretsResultPromise,
  FetchSecretsResultData,
} from "./errors";
import { createProviderInstance } from "./providerService/providerFactory";

export class NoopSecretsManagerStorage extends AbstractSecretsManagerStorage {
  async setProviderConfig(): Promise<void> {}
  async setSecretValue(): Promise<void> {}
  async setSecretValues(): Promise<void> {}
  async deleteSecretValues(): Promise<void> {}
  async getProviderConfig(): Promise<null> {
    return null;
  }
  async getSecretValue(): Promise<null> {
    return null;
  }
  async getAllProviderConfigs(): Promise<[]> {
    return [];
  }
  async getAllSecretValues(): Promise<[]> {
    return [];
  }
  async deleteProviderConfig(): Promise<void> {}
  async deleteSecretValue(): Promise<void> {}
  onProvidersChange(_callback: ProviderStorageChangeCallback): () => void {
    return () => {};
  }
  onSecretsChange(_callback: SecretStorageChangeCallback): () => void {
    return () => {};
  }
}

const getSecretsManager = (): SecretsManager => {
  if (!SecretsManager.isInitialized()) {
    return null as any;
  }
  return SecretsManager.getInstance();
};

export const initSecretsManager = async (
  userId: string
): SecretsResultPromise<void> => {
  try {
    if(!userId){
      return createSecretsError(
        SecretsErrorCode.INVALID_USER_ID,
        "Invalid user ID provided for SecretsManager initialization."
      );
    }
    const storeName = `sm-${userId}`;
    const secretsStorage = new SecretsManagerEncryptedStorage(
      storeName,
      userId
    );
    const registry = new FileBasedProviderRegistry(secretsStorage);

    SecretsManager.reset();
    await SecretsManager.initialize(registry);

    return {
      type: "success",
    };
  } catch (error) {
    if ((error as Error).name === "SafeStorageEncryptionNotAvailable") {
      return createSecretsError(
        SecretsErrorCode.SAFE_STORAGE_ENCRYPTION_NOT_AVAILABLE,
        "Safe storage encryption is not available.", // UI to show OS specific message here
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

export const fetchAndSaveSecrets = async (
  providerId: string,
  secretRefs: SecretReference[]
): SecretsResultPromise<FetchSecretsResultData> => {
  return getSecretsManager().fetchAndSaveSecrets(providerId, secretRefs);
};

export const listSecretProviders = async (): SecretsResultPromise<
  SecretProviderMetadata[]
> => {
  return getSecretsManager().listProviders();
};

export const removeSecretValue = async (
  providerId: string,
  ref: SecretReference
): SecretsResultPromise<void> => {
  return getSecretsManager().removeSecret(providerId, ref);
};

export const removeSecretValues = async (
  secrets: Array<{ providerId: string; ref: SecretReference }>
): SecretsResultPromise<void> => {
  return getSecretsManager().removeSecrets(secrets);
};

export const testSecretProviderConnectionWithConfig = async (
  config: SecretProviderConfig
): SecretsResultPromise<boolean> => {
  try {
    const provider = createProviderInstance(
      config,
      new NoopSecretsManagerStorage()
    );
    const isConnected = await provider.testConnection();
    return { type: "success", data: isConnected ?? false };
  } catch (error) {
    return createSecretsError(
      SecretsErrorCode.AUTH_FAILED,
      error instanceof Error ? error.message : "Connection test failed",
      { providerId: config.id, cause: error as Error }
    );
  }
};

export const listSecrets = async (
  providerId: string
): SecretsResultPromise<SecretValue[]> => {
  return getSecretsManager().listSecrets(providerId);
};
