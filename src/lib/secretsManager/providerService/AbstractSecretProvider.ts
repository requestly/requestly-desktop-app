/* eslint-disable no-unused-vars */
import {
  ProviderSpecificConfig,
  SecretProviderType,
  SecretReference,
  SecretValue,
} from "../types";

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_CACHE_SIZE = 100;

export abstract class AbstractSecretProvider {
  protected cache: Map<string, SecretValue> = new Map();

  /** Cache TTL in milliseconds. Subclasses can override. */
  protected cacheTtlMs: number = DEFAULT_CACHE_TTL_MS;

  /** Maximum cache size (Size of the map). Subclasses can override. */
  protected maxCacheSize: number = DEFAULT_MAX_CACHE_SIZE;

  abstract readonly type: SecretProviderType;

  abstract readonly id: string;

  protected abstract config: ProviderSpecificConfig;

  protected abstract getCacheKey(ref: SecretReference): string;

  abstract testConnection(): Promise<boolean>;

  abstract getSecret(ref: SecretReference): Promise<SecretValue | null>;

  abstract getSecrets(refs: SecretReference[]): Promise<(SecretValue | null)[]>;

  abstract setSecret(): Promise<void>;

  abstract setSecrets(): Promise<void>;

  abstract removeSecret(): Promise<void>;

  abstract removeSecrets(): Promise<void>;

  protected invalidateCache(): void {
    this.cache.clear();
  }

  protected getCachedSecret(key: string): SecretValue | null {
    const cached = this.cache.get(key);
    if (cached && cached.fetchedAt + this.cacheTtlMs > Date.now()) {
      return cached;
    }
    return null;
  }

  protected setCacheEntry(key: string, value: SecretValue): void {
    if (this.maxCacheSize <= 0) {
      return;
    }

    this.evictExpiredEntries();

    while (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, value);
  }

  protected evictExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((value, key) => {
      if (value.fetchedAt + this.cacheTtlMs <= now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  abstract refreshSecrets(): Promise<(SecretValue | null)[]>;

  static validateConfig(config: any): boolean {
    // Base implementation rejects all configs as a fail-safe.
    // Provider implementations must override with specific validation.
    if (!config) {
      return false;
    }

    return false;
  }
}
