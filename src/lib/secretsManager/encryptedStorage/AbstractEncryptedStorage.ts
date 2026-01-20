export abstract class AbstractEncryptedStorage {
  abstract initialize(): Promise<void>;

  abstract save<T extends Record<string, any>>(
    key: string,
    data: T
  ): Promise<void>;

  abstract load<T extends Record<string, any>>(key: string): Promise<T | null>;

  abstract delete(key: string): Promise<void>;
}
