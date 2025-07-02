import { type Static } from "@sinclair/typebox";
import {
  appendPath,
  createFsResource,
  getIdFromPath,
  getNormalizedPath,
  parseJsonContent,
} from "./common-utils";
import {
  CONFIG_FILE,
} from "./constants";
import {
  readFileSync,
} from "./fs-utils";
import {
  Config,
} from "./schemas";
import {
  FsResource,
} from "./types";
import { FsIgnoreManager } from "./fsIgnore-manager";
import { APIFsManager } from "./api-fs-manager";
import { CoreManager } from "./core-manager";

export class FsManager {
  private rootPath: string;

  private config: Static<typeof Config>;

  private fsIgnoreManager: FsIgnoreManager;

  apiFsManager: APIFsManager;

  constructor(rootPath: string) {
    this.rootPath = getNormalizedPath(rootPath);
    this.config = this.parseConfig();
    this.fsIgnoreManager = new FsIgnoreManager(this.rootPath, this.config);
    this.apiFsManager = new APIFsManager(this.rootPath, this.fsIgnoreManager);
  }

  reload() {
    this.config = this.parseConfig();
    this.fsIgnoreManager = new FsIgnoreManager(this.rootPath, this.config);
    this.apiFsManager = new APIFsManager(this.rootPath, this.fsIgnoreManager);
  }

  private parseConfig() {
    const configFile = this.createResource({
      id: getIdFromPath(appendPath(this.rootPath, CONFIG_FILE)),
      type: "file",
    });
    const rawConfig = readFileSync(configFile.path);
    if (rawConfig.type === "error") {
      throw new Error(
        `Could not load config from ${CONFIG_FILE}. ${rawConfig.error.message}`
      );
    }
    const parsedConfig = parseJsonContent(rawConfig.content, Config);
    if (parsedConfig.type === "error") {
      throw new Error(
        `Could not load config from ${CONFIG_FILE}. ${parsedConfig.error.message}`
      );
    }
    const { content: config } = parsedConfig;
    console.log(config);
    if (config.version !== "0.0.1") {
      throw new Error(`Unsupported version in ${CONFIG_FILE}!`);
    }
    return config;
  }

  private createResource<T extends FsResource["type"]>(params: {
    id: string;
    type: T;
  }) {
    return createFsResource({
      path: params.id,
      rootPath: this.rootPath,
      type: params.type,
    });
  }

  async healIfBroken() {
    return CoreManager.createApisFolder(this.rootPath);
  }
}
