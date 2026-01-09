import { CachedSecret } from "../types";
import { AbstractCacheStorage } from "./ICacheStorage";

export class InMemoryCacheStorage implements AbstractCacheStorage {
  private cache: Map<string, CachedSecret> = new Map();

  async load(key: string): Promise<CachedSecret | null> {
    const secret = this.cache.get(key);
    if (!secret) {
      return null;
    }

    if (Date.now() > secret.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return secret;
  }

  async save(key: string, data: CachedSecret): Promise<void> {
    this.cache.set(key, data);
  }

  async delete(id: string): Promise<void> {
    this.cache.delete(id);
  }

  async findByIdentifier(
    key: string,
    identifier: string,
    version?: string // Store multiple versions of the same secret or not?
  ): Promise<CachedSecret | null> {
    const now = Date.now();
    let found: CachedSecret | null = null;

    for (const secret of this.cache.values()) {
      // Skip expired entries
      if (now > secret.expiresAt) {
        continue;
      }

      if (
        secret.providerId === key &&
        secret.identifier === identifier &&
        secret.version === version
      ) {
        found = secret;
        break;
      }
    }

    return found;
  }

  async deleteByProvider(providerId: string): Promise<void> {
    for (const [id, secret] of this.cache.entries()) {
      if (secret.providerId === providerId) {
        this.cache.delete(id);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}
