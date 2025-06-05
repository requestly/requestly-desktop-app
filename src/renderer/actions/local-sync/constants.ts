import { homedir } from "os";

export const CORE_CONFIG_FILE_VERSION = 0.1;
export const CONFIG_FILE = "requestly.json";
export const COLLECTION_AUTH_FILE = "auth.json";
export const DESCRIPTION_FILE = "README.md";
export const COLLECTION_VARIABLES_FILE = "vars.json";
export const ENVIRONMENT_VARIABLES_FILE = "env.json";
export const ENVIRONMENT_VARIABLES_FOLDER = "environments";
export const DS_STORE_FILE = ".DS_Store";
export const GLOBAL_ENV_FILE = "global.json";
export const GIT_FOLDER = ".git";
export const GIT_IGNORE_FILE = ".gitignore";

export const GLOBAL_CONFIG_FOLDER_PATH = `${homedir()}/.config/requestly`;
export const GLOBAL_CONFIG_FILE_NAME = "config.json";
