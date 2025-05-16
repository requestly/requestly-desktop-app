// todo: move to some appropriate location
import OfflineLogConfigFetcher from "renderer/lib/proxy-interface/offlineLogConfigFetcher";
import UserPreferenceFetcher from "renderer/lib/proxy-interface/userPreferenceFetcher";

export const getCurrentProxyPort = () => {
  return global.rq.proxyServerStatus?.port || null
}

export const getDefaultProxyPort = () => {
  // Load user preferences
  const userPreferences = new UserPreferenceFetcher();
  return userPreferences.getConfig().defaultPort;
}

export const getOfflineLogConfig = () => {
  const offlineLogConfig = new OfflineLogConfigFetcher();
  return offlineLogConfig.getConfig();
}