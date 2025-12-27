export interface IEncryptedStorage {
  initialize(): Promise<void>;
  save<T extends Record<string, any>>(key: string, data: T): Promise<void>;
  load<T extends Record<string, any>>(key: string): Promise<T>;
  delete(key: string): Promise<void>;
}
