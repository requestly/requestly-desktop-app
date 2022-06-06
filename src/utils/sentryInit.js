const preferenceManager = require("../renderer/utils/userPreferencesManager");
const isMain = process.type === "browser";

const { init } = isMain
  ? require("@sentry/electron/dist/main")
  : require("@sentry/electron/dist/renderer");

let isErrorTrackingEnabled;

try {
  isErrorTrackingEnabled = preferenceManager.default.getPreferences().sentry
    .error_tracking_enabled;
} catch (error) {
  isErrorTrackingEnabled = true;
}

isErrorTrackingEnabled
  ? init({
      dsn:
        "https://47cb67fb392b46e0b0fa6607f7fa204b@o407023.ingest.sentry.io/5275504",
    })
  : null;
