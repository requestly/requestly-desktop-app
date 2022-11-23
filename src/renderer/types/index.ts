import { SSLProxyingJsonObj } from "lib/storage/types/ssl-proxying";
import { UserPreferenceObj } from "lib/storage/types/user-preference";

declare global {
  var rq: RQBgGlobalNamespace;
}

interface RQBgGlobalNamespace {
  sslProxyingStorage?: SSLProxyingJsonObj;
  sslTunnelingSocketsMap?: SSLTunnelingSocketsMap;
  userPreferences?: UserPreferenceObj
}

interface SSLTunnelingSocketsMap {
  [domain: string]: any;
}
