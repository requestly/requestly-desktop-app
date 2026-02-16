import logger from "./logger";

const isMain = process.type === "browser";
const processType = isMain ? "main" : "background-process";

const { init } = isMain
  ? require("@sentry/electron/main")
  : require("@sentry/electron/renderer");

try {
  const sentryConfig = {
    dsn: "https://47cb67fb392b46e0b0fa6607f7fa204b@o407023.ingest.sentry.io/5275504",
    environment: process.env.NODE_ENV || "production",
    initialScope: {
      tags: {
        process: processType,
        electron_version: process.versions.electron,
        chrome_version: process.versions.chrome,
        node_version: process.versions.node,
      },
    },
    // Enable debug mode in development
    debug: process.env.NODE_ENV === "development",
    // Sample rate for performance monitoring
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Capture unhandled promise rejections
    integrations: (integrations) => {
      return integrations;
    },
    beforeSend(event, _hint) {
      // Add process context to all events
      if (event.tags) {
        event.tags.process_type = processType;
      } else {
        event.tags = { process_type: processType };
      }

      // Add app version if available (only in main process)
      try {
        if (isMain) {
          let appVersion = null;

          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line global-require
            appVersion = require("../../package.json").version;
          } else {
            // eslint-disable-next-line global-require
            const { app } = require("electron");
            if (app) {
              appVersion = app.getVersion();
            }
          }

          event.tags.app_version = appVersion;
        }
      } catch (e) {
        // Ignore if app is not available
      }
      return event;
    },
  };

  init(sentryConfig);
} catch (error) {
  logger.error("[Sentry] Failed to initialize:", error);
}
