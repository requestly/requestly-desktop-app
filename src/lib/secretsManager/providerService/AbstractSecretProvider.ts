import { SecretProviderType } from "../baseTypes";
import {
  CredentialsForProvider,
  ReferenceForProvider,
  ValueForProvider,
} from "../types";

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_CACHE_SIZE = 100;

/**
 * Generic abstract base class for secret providers.
 *
 * @template T - The provider type
 */
export abstract class AbstractSecretProvider<T extends SecretProviderType> {
  protected cache: Map<string, ValueForProvider<T>> = new Map();

  protected cacheTtlMs: number = DEFAULT_CACHE_TTL_MS;

  protected maxCacheSize: number = DEFAULT_MAX_CACHE_SIZE;

  abstract readonly type: T;

  abstract readonly id: string;

  protected abstract config: CredentialsForProvider<T>;

  protected abstract getCacheKey(_ref: ReferenceForProvider<T>): string;

  abstract testConnection(): Promise<boolean>;

  abstract getSecret(_ref: ReferenceForProvider<T>): Promise<ValueForProvider<T> | null>;

  abstract getSecrets(
    _refs: ReferenceForProvider<T>[]
  ): Promise<(ValueForProvider<T> | null)[]>;

  abstract setSecret(
    _ref: ReferenceForProvider<T>,
    _value: string | Record<string, any>
  ): Promise<void>;

  abstract setSecrets(
    _entries: Array<{ ref: ReferenceForProvider<T>; value: string | Record<string, any> }>
  ): Promise<void>;

  abstract removeSecret(_ref: ReferenceForProvider<T>): Promise<void>;

  abstract removeSecrets(_refs: ReferenceForProvider<T>[]): Promise<void>;

  protected invalidateCache(): void {
    this.cache.clear();
  }

  protected getCachedSecret(key: string): ValueForProvider<T> | null {
    const cached = this.cache.get(key);
    if (cached && cached.fetchedAt + this.cacheTtlMs > Date.now()) {
      return cached;
    }
    return null;
  }

  protected setCacheEntry(key: string, value: ValueForProvider<T>): void {
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

  abstract refreshSecrets(): Promise<(ValueForProvider<T> | null)[]>;

  static validateConfig(config: any): boolean {
    // Base implementation rejects all configs as a fail-safe.
    // Provider implementations must override with specific validation.
    if (!config) {
      return false;
    }

    return false;
  }
}
