import { ICacheStorage } from "./cacheStorage/ICacheStorage";
import { CachedSecret, SecretProviderType } from "./types";

// Function
// 1. get/set/invalidate cached secrets
// 2. cache storage is pluggable (in-memory, file-based, redis, etc.)

export class SecretsCacheService {
  private storage: ICacheStorage;

  private defaultTTL: number;

  constructor(storage: ICacheStorage) {
    this.storage = storage;
  }

  async get(
    providerId: string,
    identifier: string,
    version?: string
  ): Promise<string | null> {
    const secret = await this.storage.findByIdentifier(
      providerId,
      identifier,
      version
    );
    return secret?.value ?? null;
  }

  async set(
    providerId: string,
    providerType: SecretProviderType,
    identifier: string,
    value: string,
    version?: string,
    ttl?: number
  ): Promise<void> {
    const now = Date.now();
    const secret: CachedSecret = {
      id: this.generateId(),
      identifier,
      value,
      providerId,
      providerType,
      fetchedAt: now,
      expiresAt: now + (ttl ?? this.defaultTTL),
      version,
    };
    await this.storage.set(secret);
  }

  async invalidate(
    providerId: string,
    key: string,
    version?: string
  ): Promise<void> {
    const secret = await this.storage.findByIdentifier(
      providerId,
      key,
      version
    );
    if (secret) {
      await this.storage.delete(secret.id);
    }
  }

  async invalidateByProvider(providerId: string): Promise<void> {
    await this.storage.deleteByProvider(providerId);
  }

  async clear(): Promise<void> {
    await this.storage.clear();
  }

  // eslint-disable-next-line class-methods-use-this
  private generateId(): string {
    return uuidv4();
  }
}
