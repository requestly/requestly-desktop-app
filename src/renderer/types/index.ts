import { SSLProxyingJsonObj } from "lib/storage/types/ssl-proxying";
import { UserPreferenceObj } from "lib/storage/types/user-preference";

declare global {
  var rq: RQBgGlobalNamespace;
}

interface RQBgGlobalNamespace {
  // cache of main storge
  sslProxyingStorage?: SSLProxyingJsonObj;
  sslTunnelingSocketsMap?: SSLTunnelingSocketsMap;
  userPreferences?: UserPreferenceObj;

  // local cache for background process
  proxyServerStatus?: ProxyServerObject
}

interface ProxyServerObject {
  port: number
}

interface SSLTunnelingSocketsMap {
  [domain: string]: any;
}
