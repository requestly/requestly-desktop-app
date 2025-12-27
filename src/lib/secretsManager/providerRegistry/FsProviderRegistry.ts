import * as fs from "fs/promises";
import * as path from "path";
import { IProviderRegistry } from "./IProviderRegistry";
import { SecretProviderConfig, SecretProviderType } from "../types";
import { IEncryptedStorage } from "../encryptedStorage/IEncryptedStorage";

const MANIFEST_FILENAME = "providers.json";

export interface ProvidersManifest {
  version: string;
  providers: {
    id: string;
    storagePath: string;
    type: SecretProviderType;
  }[];
}

export class FileBasedProviderRegistry implements IProviderRegistry {
  private manifestPath: string;

  constructor(
    private readonly encryptedStorage: IEncryptedStorage,
    private readonly configDir: string
  ) {
    this.manifestPath = path.join(configDir, MANIFEST_FILENAME);
  }

  async initialize(): Promise<void> {
    await this.ensureConfigDir();
  }

  async listProviders(): Promise<string[]> {
    const manifest = await this.loadManifest();
    return manifest.providers.map((p) => p.id);
  }

  async loadAllProviderConfigs(): Promise<SecretProviderConfig[]> {}

  async saveProviderConfig(config: SecretProviderConfig): Promise<void> {
    const manifest = await this.loadManifest();
    const storageKey = config.id;

    await this.encryptedStorage.save(storageKey, config);

    // Update manifest

    await this.saveManifest(manifest);
  }

  async deleteProviderConfig(id: string): Promise<void> {
    const manifest = await this.loadManifest();
    const entry = manifest.providers.find((p) => p.id === id);
    if (!entry) return;

    await this.encryptedStorage.delete(id);

    manifest.providers = manifest.providers.filter((p) => p.id !== id);
    await this.saveManifest(manifest);
  }

  async getProviderConfig(id: string): Promise<SecretProviderConfig | null> {
    const manifest = await this.loadManifest();
    const entry = manifest.providers.find((p) => p.id === id);
    if (!entry) return null;

    return this.encryptedStorage.load<SecretProviderConfig>(id);
  }

  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create config directory:", error);
    }
  }

  private async loadManifest(): Promise<ProvidersManifest> {}

  private async saveManifest(manifest: ProvidersManifest): Promise<void> {}
}
