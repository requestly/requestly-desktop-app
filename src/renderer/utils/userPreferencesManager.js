import Store from "electron-store";

import { userPreferences } from "../config";

class PreferenceManager {
  schema = {
    app_behaviour: {
      type: "object",
      properties: {
        [userPreferences.START_APP_ON_SYSTEM_STARTUP.key]: {
          type: "boolean",
        },
        [userPreferences.VISITOR_ID.key]: {
          type: "string",
        },
      },
      default: {
        [userPreferences.START_APP_ON_SYSTEM_STARTUP.key]:
          userPreferences.START_APP_ON_SYSTEM_STARTUP.defaultValue,
        [userPreferences.VISITOR_ID.key]:
          userPreferences.VISITOR_ID.defaultValue,
      },
    },
    proxy: {
      type: "object",
      properties: {
        [userPreferences.DEFAULT_PROXY_PORT.key]: {
          type: "number",
        },
      },
      default: {
        [userPreferences.DEFAULT_PROXY_PORT.key]:
          userPreferences.DEFAULT_PROXY_PORT.defaultValue,
      },
    },
    sentry: {
      type: "object",
      properties: {
        [userPreferences.ERROR_TRACKING_ENABLED.key]: {
          type: "boolean",
        },
      },
      default: {
        [userPreferences.ERROR_TRACKING_ENABLED.key]:
          userPreferences.ERROR_TRACKING_ENABLED.defaultValue,
      },
    },
  };

  constructor() {
    this.store = new Store({
      name: "UserPreferencesStorage",
      schema: this.schema,
    });
  }

  getPreferences = () => {
    return this.store.store;
  };

  setPreferences = (preference) => {
    this.store.store = preference;
  };

  getProxyDefaultHost = () => {
    return this.store.get(`proxy.${userPreferences.PROXY_HOST.key}`);
  };

  setProxyDefaultHost = (value) => {
    return this.store.set(`proxy.${userPreferences.PROXY_HOST.key}`, value);
  };

  getProxyDefaultPort = () => {
    return this.store.get(`proxy.${userPreferences.DEFAULT_PROXY_PORT.key}`);
  };

  setProxyDefaultPort = (value) => {
    return this.store.set(
      `proxy.${userPreferences.DEFAULT_PROXY_PORT.key}`,
      value
    );
  };

  getPreferenceStartAppOnSystemStartup = () => {
    return this.store.get(
      `app_behaviour.${userPreferences.START_APP_ON_SYSTEM_STARTUP.key}`
    );
  };

  setPreferenceStartAppOnSystemStartup = (value) => {
    return this.store.set(
      `app_behaviour.${userPreferences.START_APP_ON_SYSTEM_STARTUP.key}`,
      value
    );
  };

  getVisitorId = () => {
    return this.store.get(`app_behaviour.${userPreferences.VISITOR_ID.key}`);
  };

  setVisitorId = (value) => {
    return this.store.set(
      `app_behaviour.${userPreferences.VISITOR_ID.key}`,
      value
    );
  };

  resetPreferences = () => {
    this.store.reset("app_behaviour", "proxy", "certificate");
  };
}

const preferenceManager = new PreferenceManager();

export default preferenceManager;
