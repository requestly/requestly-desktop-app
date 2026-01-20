import * as path from "path";
import { SecretProviderConfig } from "../types";
import { createProviderInstance } from "../providerService/providerFactory";
import {
  AbstractProviderRegistry,
  ProviderManifest,
} from "./AbstractProviderRegistry";
import { AbstractEncryptedStorage } from "../encryptedStorage/AbstractEncryptedStorage";
import { AbstractSecretProvider } from "../providerService/AbstractSecretProvider";
import { createFsResource } from "../../../renderer/actions/local-sync/common-utils";
import {
  createGlobalConfigFolder,
  getIfFileExists,
  getIfFolderExists,
  parseFile,
  writeToGlobalConfig,
} from "../../../renderer/actions/local-sync/fs-utils";
import {
  CORE_CONFIG_FILE_VERSION,
  GLOBAL_CONFIG_FILE_NAME,
} from "../../../renderer/actions/local-sync/constants";
import { GlobalConfigRecordFileType } from "../../../renderer/actions/local-sync/file-types/file-types";
import { Static } from "@sinclair/typebox";
import { GlobalConfig } from "../../../renderer/actions/local-sync/schemas";

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
    await this.encryptedStorage.initialize();
    await this.ensureConfigDir();
    await this.ensureConfigFile();
    await this.initProvidersFromManifest();
  }

  private async initProvidersFromManifest() {
    const configs = await this.getAllProviderConfigs();
    configs.forEach((config) => {
      this.providers.set(config.id, createProviderInstance(config));
    });
  }

  async getAllProviderConfigs(): Promise<SecretProviderConfig[]> {
    const providerManifest = await this.loadManifest();

    console.log("!!!debug", "manifest loaded", providerManifest);
    const configs: SecretProviderConfig[] = [];

    for (const entry of providerManifest) {
      const config = await this.encryptedStorage.load<SecretProviderConfig>(
        entry.id
      );

      if (config) {
        configs.push(config);
      } else {
        // Should we throw error for this case?
        console.log("!!!debug", "Config not found for entry", entry);
      }
    }

    console.log("!!!debug", "all configs", configs);
    return configs;
  }

  async setProviderConfig(config: SecretProviderConfig): Promise<void> {
    const storageKey = config.id;

    await this.encryptedStorage.save(storageKey, config);

    const manifest = await this.loadManifest();
    const existingEntryIndex = manifest.findIndex((p) => p.id === config.id);
    if (existingEntryIndex !== -1) {
      manifest[existingEntryIndex] = { id: config.id, type: config.type };
    } else {
      manifest.push({ id: config.id, type: config.type });
    }

    await this.saveManifest(manifest);
    this.providers.set(config.id, createProviderInstance(config));
  }

  async deleteProviderConfig(id: string): Promise<void> {
    const providerManifest = await this.loadManifest();
    const entry = providerManifest.find((p) => p.id === id);
    if (!entry) return;

    await this.encryptedStorage.delete(id);

    providerManifest.splice(providerManifest.indexOf(entry), 1);

    await this.saveManifest(providerManifest);
    this.providers.delete(id);
  }

  async getProviderConfig(id: string): Promise<SecretProviderConfig | null> {
    const providerManifest = await this.loadManifest();
    const entry = providerManifest.find((p) => p.id === id);
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

  private async ensureConfigFile(): Promise<void> {
    const globalConfigFileResource = createFsResource({
      rootPath: this.configDir,
      path: this.manifestPath,
      type: "file",
    });

    const globalConfigFileExists = await getIfFileExists(
      globalConfigFileResource
    );

    if (!globalConfigFileExists) {
      const config: Static<typeof GlobalConfig> = {
        version: CORE_CONFIG_FILE_VERSION,
        workspaces: [],
        providers: [],
      };
      const writeResult = await writeToGlobalConfig(config);

      if (writeResult.type === "error") {
        throw new Error("Failed to create manifest file.");
      }
    }
  }

  protected async loadManifest(): Promise<ProviderManifest> {
    const globalConfigFileResource = createFsResource({
      rootPath: this.configDir,
      path: this.manifestPath,
      type: "file",
    });

    const globalConfigFileExists = await getIfFileExists(
      globalConfigFileResource
    );

    if (!globalConfigFileExists) {
      return [];
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
    return (readResult.content.providers ?? []) as ProviderManifest;
  }

  protected async saveManifest(
    providerManifest: ProviderManifest
  ): Promise<void> {
    const globalConfigFileResource = createFsResource({
      rootPath: this.configDir,
      path: this.manifestPath,
      type: "file",
    });

    const readResult = await parseFile({
      resource: globalConfigFileResource,
      fileType: new GlobalConfigRecordFileType(),
    });

    if (readResult.type === "error") {
      throw new Error("Failed to parse manifest file.");
    }

    const updatedConfig: Static<typeof GlobalConfig> = {
      version: readResult.content.version || CORE_CONFIG_FILE_VERSION,
      workspaces: readResult.content.workspaces || [],
      providers: providerManifest,
    };

    const writeResult = await writeToGlobalConfig(updatedConfig);

    if (writeResult.type === "error") {
      throw new Error("Failed to write manifest file.");
    }
  }
}
