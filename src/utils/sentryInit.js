const isMain = process.type === "browser";
const processType = isMain ? "main" : "renderer";

const { init } = isMain
  ? require("@sentry/electron/main")
  : require("@sentry/electron/renderer");

let isErrorTrackingEnabled = true; // Default to enabled

// Only try to load preferences in renderer process
if (!isMain) {
  try {
    // eslint-disable-next-line global-require
    const preferenceManager = require("../renderer/utils/userPreferencesManager");
    isErrorTrackingEnabled = preferenceManager.default.getPreferences().sentry
      .error_tracking_enabled;
  } catch (error) {
    // Keep default if preferences can't be loaded
    console.warn("[Sentry] Could not load user preferences, defaulting to enabled");
  }
}

if (isErrorTrackingEnabled) {
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
      tracesSampleRate: 0.1,
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
            // eslint-disable-next-line global-require
            const { app } = require("electron");
            if (app) {
              event.tags.app_version = app.getVersion();
            }
          }
        } catch (e) {
          // Ignore if app is not available
        }
        return event;
      },
    };

    init(sentryConfig);
  } catch (error) {
    console.error("[Sentry] Failed to initialize:", error);
  }
} else {
  console.log(`[Sentry] Error tracking is disabled for ${processType} process`);
}
