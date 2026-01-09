import { SecretProviderType, SecretReference } from "../types";

// evaluate if its bettter to have abstract class than interface
interface ISecretProvider {
  type: SecretProviderType;
  id: string;

  testConnection(): Promise<boolean>;
  fetchSecret(ref: SecretReference): Promise<string>;
  listSecrets(): Promise<string[]>;
}

export abstract class AbstractSecretProvider implements ISecretProvider {
  abstract readonly type: SecretProviderType;

  abstract readonly id: string;

  protected config: any;

  abstract testConnection(): Promise<boolean>;

  abstract fetchSecret(ref: SecretReference): Promise<string>;

  abstract listSecrets(): Promise<string[]>;

  static validateConfig(config: any): boolean {
    throw new Error("Not implemented");
  }
}
