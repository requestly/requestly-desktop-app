import * as fs from "fs";
import * as path from "path";
import { SecretProviderConfig, SecretProviderType } from "../types";
import { createProvider } from "../providerService/providerFactory";
import {
  AbstractProviderRegistry,
  ProvidersManifest,
} from "./AbstractProviderRegistry";
import { AbstractEncryptedStorage } from "../encryptedStorage/AbstractEncryptedStorage";
import { AbstractSecretProvider } from "../providerService/AbstractSecretProvider";
import { createFsResource } from "../../../renderer/actions/local-sync/common-utils";
import {
  createGlobalConfigFolder,
  getIfFileExists,
  getIfFolderExists,
  parseFile,
} from "../../../renderer/actions/local-sync/fs-utils";
import { GLOBAL_CONFIG_FILE_NAME } from "../../../renderer/actions/local-sync/constants";
import { GlobalConfigRecordFileType } from "../../../renderer/actions/local-sync/file-types/file-types";

// TODO:@nafees check version of config.json
const MANIFEST_FILENAME = GLOBAL_CONFIG_FILE_NAME;
export class FileBasedProviderRegistry extends AbstractProviderRegistry {
  private manifestPath: string;

  private configDir: string;

  protected providers: Map<string, AbstractSecretProvider> = new Map();

  constructor(encryptedStorage: AbstractEncryptedStorage, configDir: string) {
    super(encryptedStorage);
    this.configDir = configDir;
    this.manifestPath = path.join(configDir, MANIFEST_FILENAME);
  }

  getProvider(providerId: string): AbstractSecretProvider | null {
    return this.providers.get(providerId) || null;
  }

  async initialize(): Promise<void> {
    await this.ensureConfigDir();
    this.initProvidersFromManifest();
  }

  private async initProvidersFromManifest() {
    const configs = await this.getAllProviderConfigs();
    configs.forEach((config) => {
      this.providers.set(config.id, this.createProviderInstance(config));
    });
  }

  async getAllProviderConfigs(): Promise<SecretProviderConfig[]> {
    const manifest = await this.loadManifest();

    console.log("!!!debug","manifest loaded",)
    const configs: SecretProviderConfig[] = [];

    // for (const entry of manifest.providers) {
    //   const config = await this.encryptedStorage.load<SecretProviderConfig>(
    //     entry.id
    //   );
    //   configs.push(config);
    // }

    // return configs;
  }

  async setProviderConfig(config: SecretProviderConfig): Promise<void> {
    const manifest = await this.loadManifest();
    const storageKey = config.id;

    // do atomic write
    await this.encryptedStorage.save(storageKey, config);

    // Update manifest

    await this.saveManifest(manifest);
    this.providers.set(config.id, this.createProviderInstance(config));
  }

  async deleteProviderConfig(id: string): Promise<void> {
    const manifest = await this.loadManifest();
    const entry = manifest.providers.find((p) => p.id === id);
    if (!entry) return;

    await this.encryptedStorage.delete(id);

    manifest.providers = manifest.providers.filter((p) => p.id !== id);
    await this.saveManifest(manifest);
    this.providers.delete(id);
  }

  async getProviderConfig(id: string): Promise<SecretProviderConfig | null> {
    const manifest = await this.loadManifest();
    const entry = manifest.providers.find((p) => p.id === id);
    if (!entry) return null;

    return this.encryptedStorage.load<SecretProviderConfig>(id);
  }

  private async ensureConfigDir(): Promise<void> {
    try {
      const globalConfigFolderResource = createFsResource({
        rootPath: this.configDir,
        path: this.configDir,
        type: "folder",
      });
      const globalConfigFolderExists = await getIfFolderExists(
        globalConfigFolderResource
      );

      if (!globalConfigFolderExists) {
        await createGlobalConfigFolder();
      }
    } catch (error) {
      console.error("Failed to create config directory:", error);
      throw new Error("Failed to create config directory.");
    }
  }

  protected async loadManifest(): Promise<ProvidersManifest> {
    const globalConfigFileResource = createFsResource({
      rootPath: this.configDir,
      path: this.manifestPath,
      type: "file",
    });

    const globalConfigFileExists = await getIfFileExists(
      globalConfigFileResource
    );

    if (!globalConfigFileExists) {
      return { providers: [] };
    }

    const readResult = await parseFile({
      resource: globalConfigFileResource,
      fileType: new GlobalConfigRecordFileType(),
    });

    if (readResult.type === "error") {
      throw new Error("Failed to parse manifest file.");
    }

    console.log("!!!debug", "readResult", readResult);
    // TODO:@nafees handle versioning and schema in schema.ts
    return (readResult.content.providers ?? []) as ProvidersManifest;
  }

  protected async saveManifest(manifest: ProvidersManifest): Promise<void> {}

  // eslint-disable-next-line class-methods-use-this
  protected createProviderInstance(
    config: SecretProviderConfig
  ): AbstractSecretProvider {
    return createProvider(config);
  }
}
