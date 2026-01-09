// Can this be storage and not encrypted storage?
// export interface IEncryptedStorage {
//   initialize(): Promise<void>;
//   save<T extends Record<string, any>>(key: string, data: T): Promise<void>;
//   load<T extends Record<string, any>>(key: string): Promise<T>;
//   delete(key: string): Promise<void>;
// }

export interface ISecretsStorage {
  initialize(): Promise<void>;
  save<T extends Record<string, any>>(key: string, data: T): Promise<void>;
  load<T extends Record<string, any>>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
}

export abstract class AbstractEncryptedStorage implements ISecretsStorage {
  abstract initialize(): Promise<void>;

  abstract save<T extends Record<string, any>>(
    key: string,
    data: T
  ): Promise<void>;

  abstract load<T extends Record<string, any>>(key: string): Promise<T>;

  abstract delete(key: string): Promise<void>;
}
