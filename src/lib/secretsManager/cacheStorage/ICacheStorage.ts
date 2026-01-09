import { CachedSecret } from "../types";
import { ISecretsStorage } from "../encryptedStorage/IEncryptedStorage";

// export interface ICacheStorage {
/**
 * Get a cached secret by its unique ID
 */
//   get(id: string): Promise<CachedSecret | null>;

//   /**
//    * Store a cached secret
//    */
//   set(secret: CachedSecret): Promise<void>;

//   /**
//    * Delete a cached secret by its ID
//    */
//   delete(id: string): Promise<void>;

//   /**
//    * Find a cached secret by provider ID, key, and optional version
//    */
//   findByIdentifier(
//     providerId: string,
//     identifier: string,
//     version?: string
//   ): Promise<CachedSecret | null>;

//   /**
//    * Delete all cached secrets for a specific provider
//    */
//   deleteByProvider(providerId: string): Promise<void>;

//   /**
//    * Clear all cached secrets
//    */
//   clear(): Promise<void>;
// }

export abstract class AbstractCacheStorage implements ISecretsStorage {
  abstract initialize(): Promise<void>;

  abstract save<CachedSecret>(key: string, data: CachedSecret): Promise<void>;

  abstract load<CachedSecret>(key: string): Promise<CachedSecret | null>;

  abstract delete(key: string): Promise<void>;

  abstract findByIdentifier(
    providerId: string,
    identifier: string,
    version?: string
  ): Promise<CachedSecret | null>;

  abstract clear(): Promise<void>;
}
