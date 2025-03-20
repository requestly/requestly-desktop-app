import { homedir } from "os";
import {
  ApiRecord,
  Auth,
  Description,
  EnvironmentRecord,
  Variables,
} from "./schemas";
import { FileType } from "./types";
import { TSchema, Type } from "@sinclair/typebox";

export const CURRENT_CONFIG_FILE_VERSION = 0.1;
export const CONFIG_FILE = "requestly.json";
export const COLLECTION_AUTH_FILE = "auth.json";
export const DESCRIPTION_FILE = "description.md";
export const COLLECTION_VARIABLES_FILE = "vars.json";
export const ENVIRONMENT_VARIABLES_FILE = "env.json";
export const ENVIRONMENT_VARIABLES_FOLDER = "environments";
export const DS_STORE_FILE = ".DS_Store";
export const GLOBAL_ENV_FILE = "global.json";

export const GLOBAL_CONFIG_FOLDER_PATH = `${homedir()}/.config/requestly`;
export const GLOBAL_CONFIG_FILE_NAME = "config.json";

export const fileTypeToValidator: Record<FileType, TSchema> = {
  [FileType.API]: ApiRecord,
  [FileType.ENVIRONMENT]: EnvironmentRecord,
  [FileType.COLLECTION_VARIABLES]: Variables,
  [FileType.DESCRIPTION]: Description,
  [FileType.AUTH]: Auth,
  [FileType.UNKNOWN]: Type.Unknown(),
};
