import { SSLProxyingJsonObj } from "lib/storage/types/ssl-proxying";

declare global {
  var rq: RQBgGlobalNamespace;
}

interface RQBgGlobalNamespace {
  sslProxyingStorage?: SSLProxyingJsonObj;
  sslTunnelingSocketsMap?: SSLTunnelingSocketsMap;
}

interface SSLTunnelingSocketsMap {
  [domain: string]: any;
}
