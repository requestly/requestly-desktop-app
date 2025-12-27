import { SecretProviderConfig } from "../types";

export interface IProviderRegistry {
  initialize(): Promise<void>;
  listProviders(): Promise<string[]>;
  loadAllProviderConfigs(): Promise<SecretProviderConfig[]>;
  saveProviderConfig(config: SecretProviderConfig): Promise<void>;
  deleteProviderConfig(id: string): Promise<void>;
  getProviderConfig(id: string): Promise<SecretProviderConfig | null>;
}
