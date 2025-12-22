import { SecretProviderType } from "./providerService/types";

/**
 * Cached secret entry
 */
interface CachedSecret {
  value: string;
  providerId: string;
  providerType: SecretProviderType;
  secretName: string;
  fetchedAt: number;
  expiresAt: number;
}

/**
 * TTL configuration per provider type
 */
const DEFAULT_TTL: Record<SecretProviderType, number> = {
  [SecretProviderType.AWS_SECRETS_MANGER]: 60 * 60 * 1000, // 60 minutes
};

// Only 1 provider active at a time, so no need for complex strategies
// name to value is enough

/**
 * In-memory cache for secrets
 * - Session-scoped (cleared on app restart)
 * - TTL-based expiration
 * - Provider-aware invalidation
 */
export class CacheService {
  private cache: Map<string, CachedSecret> = new Map();

  get(secretName: string): string | null {
    const entry = this.cache.get(secretName);

    if (!entry) {
      // provider.fetchSecret(secretName);
      //

    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(secretName);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a cached secret
   */
  set(
    providerId: string,
    providerType: SecretProviderType,
    secretName: string,
    value: string,
    customTTL?: number
  ): void {
    const key = this.getCacheKey(providerId, secretName);
    const ttl = customTTL ?? DEFAULT_TTL[providerType];
    const now = Date.now();

    this.cache.set(key, {
      value,
      providerId,
      providerType,
      secretName,
      fetchedAt: now,
      expiresAt: ttl === Infinity ? Infinity : now + ttl,
    });
  }

  /**
   * Invalidate a specific secret
   */
  invalidate(providerId: string, secretName: string): boolean {
    const key = this.getCacheKey(providerId, secretName);
    return this.cache.delete(key);
  }

  /**
   * Invalidate all secrets from a specific provider
   */
  invalidateByProvider(providerId: string): number {
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.providerId === providerId) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Invalidate all secrets of a specific provider type
   */
  invalidateByProviderType(providerType: SecretProviderType): number {
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.providerType === providerType) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all cached secrets
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Clean up expired entries
   * Should be called periodically
   */
  cleanExpired(): number {
    let count = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== Infinity && now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get all cached entries (for debugging)
   */
  getAllEntries(): Array<{ key: string; entry: CachedSecret }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry,
    }));
  }

  /**
   * Check if a specific secret is cached and valid
   */
  has(providerId: string, secretName: string): boolean {
    const key = this.getCacheKey(providerId, secretName);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt !== Infinity && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get time until a cached secret expires (in ms)
   * Returns null if not cached or already expired
   */
  getTimeToExpiry(providerId: string, secretName: string): number | null {
    const key = this.getCacheKey(providerId, secretName);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt === Infinity) {
      return Infinity;
    }

    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : null;
  }
}
