// todo: move to some appropriate location
import UserPreferenceFetcher from "renderer/lib/proxy-interface/userPreferenceFetcher";

export const getCurrentProxyPort = () => {
  return global.rq.proxyServerStatus?.port || null
}

export const getDefaultProxyPort = () => {
  // Load user preferences
  const userPreferences = new UserPreferenceFetcher();
  return userPreferences.getConfig().defaultPort;
}

export const getLocalFileLogConfig = () => {
  const userPreferences = new UserPreferenceFetcher();
  const userConfig = userPreferences.getConfig()
  const localFileLogConfig = {
    isEnabled: userConfig.isEnabled,
    storePath: userConfig.storePath,
    filter: userConfig.filter
  }
  return localFileLogConfig;
}