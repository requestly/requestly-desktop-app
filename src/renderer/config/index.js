const path = require("path");
const { app } = require("@electron/remote");
// PACKAGE.JSON
const packageJson = require("../../../package.json");
// CONSTANTS
const STATIC_FILES_DIR = require("./sub/staticFilesDirectory");

// Static config can't be modified by the user
const staticConfig = {
  APP_NAME: packageJson.productName,
  PROXY_HOST: "127.0.0.1",
  BROWSER_CONFIG_PATH: path.resolve(
    unescape(app.getPath("appData")),
    "Requestly",
    ".browser-config"
  ),
  CERTS_PATH: path.resolve(
    unescape(app.getPath("appData")),
    "Requestly",
    ".requestly-certs"
  ),
  ROOT_CERT_PATH: path.resolve(
    unescape(app.getPath("appData")),
    "Requestly",
    ".requestly-certs",
    "certs",
    "ca.pem"
  ),
  CERT_NAME: "RequestlyCA",
  CERT_VALIDITY: {
    // Number of days - before the current date - Keep minimum 1 to avoid 12am date change issues
    START_BEFORE: 1,
    // Number of days - after the current date - Keep minimum 1 to avoid 12am date change issues
    // CAUTION : Increasing this count might affect current app users
    END_AFTER: 365,
  },
  // Notably, for this file, this is the same when either bundled or unbundled.
  // That's not true for most other files! Everything should use this instead of __dirname:
  STATIC_FILES_DIR: STATIC_FILES_DIR,

  PROXY_TEST_PAGE_URL: "http://amiusing.requestly.io",
};

module.exports.staticConfig = staticConfig;

// User preferences can be modified by the user via the react app
const userPreferences = {
  DEFAULT_PROXY_PORT: {
    key: "proxy_port",
    defaultValue: 8080,
  },
  START_APP_ON_SYSTEM_STARTUP: {
    key: "start_app_on_system_startup",
    defaultValue: false,
  },
  VISITOR_ID: {
    key: "visitor_id",
    defaultValue: "",
  },
  ERROR_TRACKING_ENABLED: {
    key: "error_tracking_enabled",
    defaultValue: true,
  },
};

module.exports.userPreferences = userPreferences;
