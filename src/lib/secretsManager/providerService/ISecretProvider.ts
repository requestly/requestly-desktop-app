import { SecretProviderType } from "../types";

export interface ISecretProvider {
  type: SecretProviderType;
  id: string;

  testConnection(): Promise<boolean>;
  fetchSecret(secretName: string): Promise<string>;
  listSecrets(): Promise<string[]>;

  validateConfig(): boolean;
}
