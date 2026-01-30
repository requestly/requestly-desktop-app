/**
 * Usage Examples for Type-Safe Secrets Manager
 * 
 * This file demonstrates how TypeScript automatically infers types
 * throughout the secrets manager system.
 */

import {
  SecretProviderType,
  AWSSecretProviderConfig,
  HashicorpVaultProviderConfig,
  AwsSecretReference,
  VaultSecretReference,
} from "./types";
import { createProviderInstance, createTypedProviderInstance } from "./providerService/providerFactory";
import { AWSSecretsManagerProvider } from "./providerService/awsSecretManagerProvider";
import { HashicorpVaultProvider } from "./providerService/hashicorpVaultProvider";

// ============================================================================
// Example 1: Creating Provider Configurations (Type-Safe)
// ============================================================================

// AWS Provider Config - TypeScript enforces correct config structure
const awsConfig: AWSSecretProviderConfig = {
  id: "aws-prod",
  type: SecretProviderType.AWS_SECRETS_MANAGER,
  name: "AWS Production",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  credentials: {
    accessKeyId: "AKIA...",
    secretAccessKey: "...",
    region: "us-east-1",
    sessionToken: "...", // optional
  },
};

// HashiCorp Vault Config - TypeScript enforces correct config structure
const vaultConfig: HashicorpVaultProviderConfig = {
  id: "vault-dev",
  type: SecretProviderType.HASHICORP_VAULT,
  name: "Vault Development",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  credentials: {
    address: "https://vault.example.com",
    token: "s.xyz...",
    namespace: "admin", // optional
  },
};

// ❌ This will cause a TypeScript error - wrong config type for provider type
// const invalidConfig: AWSSecretProviderConfig = {
//   id: "invalid",
//   type: SecretProviderType.HASHICORP_VAULT, // ❌ Error: type mismatch
//   ...
// };

// ============================================================================
// Example 2: Creating Provider Instances (Type-Safe Factory)
// ============================================================================

async function example2() {
  // Generic factory - returns AbstractSecretProvider<SecretProviderType>
  const awsProvider = createProviderInstance(awsConfig);
  const vaultProvider = createProviderInstance(vaultConfig);

  // TypeScript knows the provider type from the instance
  console.log(awsProvider.type); // SecretProviderType.AWS_SECRETS_MANAGER
  console.log(vaultProvider.type); // SecretProviderType.HASHICORP_VAULT

  // Strongly-typed factory - returns specific provider type
  const typedAwsProvider = createTypedProviderInstance(awsConfig);
  // typedAwsProvider is AbstractSecretProvider<SecretProviderType.AWS_SECRETS_MANAGER>
  
  const typedVaultProvider = createTypedProviderInstance(vaultConfig);
  // typedVaultProvider is AbstractSecretProvider<SecretProviderType.HASHICORP_VAULT>
}

// ============================================================================
// Example 3: Working with Secret References (Type-Safe)
// ============================================================================

async function example3() {
  const awsProvider = new AWSSecretsManagerProvider(awsConfig);
  const vaultProvider = new HashicorpVaultProvider(vaultConfig);

  // AWS Secret Reference - TypeScript enforces correct structure
  const awsRef: AwsSecretReference = {
    type: SecretProviderType.AWS_SECRETS_MANAGER,
    identifier: "arn:aws:secretsmanager:us-east-1:123456789:secret:myapp/config",
    version: "AWSCURRENT", // optional
  };

  // Vault Secret Reference - TypeScript enforces correct structure
  const vaultRef: VaultSecretReference = {
    type: SecretProviderType.HASHICORP_VAULT,
    path: "secret/data/myapp/config",
    version: 2, // optional - KV v2 version number
  };

  // TypeScript ensures you pass the correct reference type to each provider
  const awsSecret = await awsProvider.getSecret(awsRef); // ✅ Correct
  const vaultSecret = await vaultProvider.getSecret(vaultRef); // ✅ Correct

  // ❌ These would cause TypeScript errors:
  // await awsProvider.getSecret(vaultRef); // ❌ Error: wrong reference type
  // await vaultProvider.getSecret(awsRef); // ❌ Error: wrong reference type

  // TypeScript knows the exact return types
  if (awsSecret) {
    console.log(awsSecret.ARN); // ✅ ARN exists on AwsSecretValue
    console.log(awsSecret.value); // ✅ value is string | undefined
    // console.log(awsSecret.data); // ❌ Error: data doesn't exist on AwsSecretValue
  }

  if (vaultSecret) {
    console.log(vaultSecret.data); // ✅ data exists on VaultSecretValue
    console.log(vaultSecret.metadata?.version); // ✅ metadata is optional
    // console.log(vaultSecret.ARN); // ❌ Error: ARN doesn't exist on VaultSecretValue
  }
}

// ============================================================================
// Example 4: Batch Operations (Type-Safe)
// ============================================================================

async function example4() {
  const awsProvider = new AWSSecretsManagerProvider(awsConfig);
  const vaultProvider = new HashicorpVaultProvider(vaultConfig);

  // Get multiple secrets - types are preserved
  const awsRefs: AwsSecretReference[] = [
    {
      type: SecretProviderType.AWS_SECRETS_MANAGER,
      identifier: "secret-1",
    },
    {
      type: SecretProviderType.AWS_SECRETS_MANAGER,
      identifier: "secret-2",
    },
  ];

  const vaultRefs: VaultSecretReference[] = [
    {
      type: SecretProviderType.HASHICORP_VAULT,
      path: "secret/data/app1",
    },
    {
      type: SecretProviderType.HASHICORP_VAULT,
      path: "secret/data/app2",
    },
  ];

  const awsSecrets = await awsProvider.getSecrets(awsRefs);
  // TypeScript knows: awsSecrets is (AwsSecretValue | null)[]

  const vaultSecrets = await vaultProvider.getSecrets(vaultRefs);
  // TypeScript knows: vaultSecrets is (VaultSecretValue | null)[]

  // Type-safe iteration
  awsSecrets.forEach((secret) => {
    if (secret) {
      console.log(secret.ARN); // ✅ ARN exists
      console.log(secret.versionId); // ✅ versionId exists
    }
  });

  vaultSecrets.forEach((secret) => {
    if (secret) {
      console.log(secret.path); // ✅ path exists
      console.log(secret.data); // ✅ data exists
    }
  });
}

// ============================================================================
// Example 5: Setting Secrets (Type-Safe)
// ============================================================================

async function example5() {
  const awsProvider = new AWSSecretsManagerProvider(awsConfig);
  const vaultProvider = new HashicorpVaultProvider(vaultConfig);

  const awsRef: AwsSecretReference = {
    type: SecretProviderType.AWS_SECRETS_MANAGER,
    identifier: "my-secret",
  };

  const vaultRef: VaultSecretReference = {
    type: SecretProviderType.HASHICORP_VAULT,
    path: "secret/data/myapp/config",
  };

  // Set a single secret - both string and object values are supported
  await awsProvider.setSecret(awsRef, "my-secret-value");
  await vaultProvider.setSecret(vaultRef, {
    database: "postgres://...",
    apiKey: "xyz...",
  });

  // Batch set
  await awsProvider.setSecrets([
    { ref: awsRef, value: "value1" },
  ]);

  await vaultProvider.setSecrets([
    {
      ref: { type: SecretProviderType.HASHICORP_VAULT, path: "secret/data/app1" },
      value: { key1: "value1" },
    },
    {
      ref: { type: SecretProviderType.HASHICORP_VAULT, path: "secret/data/app2" },
      value: { key2: "value2" },
    },
  ]);
}

// ============================================================================
// Example 6: Using the Registry (Type-Safe)
// ============================================================================

async function example6() {
  // Assume we have a registry instance
  const registry: any = null; // FileBasedProviderRegistry instance

  // Get a provider without knowing its type
  const provider = registry.getProvider("aws-prod");
  if (provider) {
    // provider is AbstractSecretProvider<SecretProviderType>
    console.log(provider.type);
  }

  // Get a provider with a specific type (type-safe)
  const awsProvider = registry.getTypedProvider(
    "aws-prod",
    SecretProviderType.AWS_SECRETS_MANAGER
  );

  if (awsProvider) {
    // TypeScript knows: awsProvider is AbstractSecretProvider<SecretProviderType.AWS_SECRETS_MANAGER>
    const ref: AwsSecretReference = {
      type: SecretProviderType.AWS_SECRETS_MANAGER,
      identifier: "my-secret",
    };
    
    const secret = await awsProvider.getSecret(ref);
    // TypeScript knows: secret is AwsSecretValue | null
    
    if (secret) {
      console.log(secret.ARN); // ✅ Type-safe access to AWS-specific fields
    }
  }
}

// ============================================================================
// Example 7: Type Guards and Runtime Checks
// ============================================================================

async function example7() {
  const registry: any = null; // FileBasedProviderRegistry instance
  
  // Get a provider and use type guards
  const provider = registry.getProvider("some-provider-id");
  
  if (provider) {
    // Runtime check with type narrowing
    if (provider.type === SecretProviderType.AWS_SECRETS_MANAGER) {
      // TypeScript narrows the type here
      const awsProvider = provider as AWSSecretsManagerProvider;
      // Now you have full access to AWS-specific methods if any
    } else if (provider.type === SecretProviderType.HASHICORP_VAULT) {
      const vaultProvider = provider as HashicorpVaultProvider;
      // Now you have full access to Vault-specific methods if any
    }
  }
}

// ============================================================================
// Example 8: Adding a New Provider (Easy Extension)
// ============================================================================

/**
 * To add a new provider (e.g., Azure Key Vault):
 * 
 * 1. Add the provider type to the enum in types.ts:
 *    ```
 *    export enum SecretProviderType {
 *      AWS_SECRETS_MANAGER = "aws",
 *      HASHICORP_VAULT = "vault",
 *      AZURE_KEY_VAULT = "azure", // ← Add this
 *    }
 *    ```
 * 
 * 2. Add the config interface in types.ts:
 *    ```
 *    export interface AzureKeyVaultConfig {
 *      vaultUrl: string;
 *      tenantId: string;
 *      clientId: string;
 *      clientSecret: string;
 *    }
 *    ```
 * 
 * 3. Add to the discriminated unions in types.ts:
 *    ```
 *    export type AzureKeyVaultProviderConfig = ProviderConfig<
 *      SecretProviderType.AZURE_KEY_VAULT,
 *      AzureKeyVaultConfig
 *    >;
 *    
 *    export type SecretProviderConfig = 
 *      | AWSSecretProviderConfig 
 *      | HashicorpVaultProviderConfig
 *      | AzureKeyVaultProviderConfig; // ← Add this
 *    ```
 * 
 * 4. Add reference and value types in types.ts:
 *    ```
 *    export interface AzureSecretReference extends BaseSecretReference<...> {
 *      name: string;
 *      version?: string;
 *    }
 *    
 *    export interface AzureSecretValue extends BaseSecretValue<...> {
 *      value: string;
 *      id: string;
 *      // ... other Azure-specific fields
 *    }
 *    ```
 * 
 * 5. Add to the type map in types.ts:
 *    ```
 *    export interface ProviderTypeMap {
 *      [SecretProviderType.AWS_SECRETS_MANAGER]: { ... };
 *      [SecretProviderType.HASHICORP_VAULT]: { ... };
 *      [SecretProviderType.AZURE_KEY_VAULT]: { // ← Add this
 *        config: AzureKeyVaultConfig;
 *        providerConfig: AzureKeyVaultProviderConfig;
 *        reference: AzureSecretReference;
 *        value: AzureSecretValue;
 *      };
 *    }
 *    ```
 * 
 * 6. Create the provider class (azureKeyVaultProvider.ts):
 *    ```
 *    export class AzureKeyVaultProvider extends AbstractSecretProvider<
 *      SecretProviderType.AZURE_KEY_VAULT
 *    > {
 *      readonly type = SecretProviderType.AZURE_KEY_VAULT as const;
 *      // ... implement abstract methods
 *    }
 *    ```
 * 
 * 7. Add to the factory in providerFactory.ts:
 *    ```
 *    case SecretProviderType.AZURE_KEY_VAULT:
 *      return new AzureKeyVaultProvider(config as AzureKeyVaultProviderConfig);
 *    ```
 * 
 * That's it! TypeScript will now enforce type safety for your new provider
 * throughout the entire system.
 */

export {};
