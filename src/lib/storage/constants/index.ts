let app;
try {
  app = require("@electron/remote").app; // for when running in the renderer process
} catch (error) {
  app = require("electron").app; // for when running in the main process
}

export enum STORE_NAME {
  SSL_PROXYING = "SSLProxying",
  USER_PREFERENCE = "UserPreference",
  ACCESSED_FILES = "RecentlyAccessedFiles",
}

export const DEFAULT_PROXY_PORT = 8281
export const DEFAULT_LOCAL_FILE_LOG_CONFIG = {
  isEnabled: true,
  storePath: app.getPath("appData"),
  filter: [],
}
