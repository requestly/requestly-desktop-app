import { STORE_NAME } from "lib/storage/constants";
import { SSLProxyingJsonObj } from "lib/storage/types/ssl-proxying";
import storageCacheService from "renderer/services/storage-cache";
import BaseConfigFetcher from "./base";

class SSLProxyingConfigFetcher implements BaseConfigFetcher {
  getConfig = (): SSLProxyingJsonObj => {
    return storageCacheService.getCache(STORE_NAME.SSL_PROXYING) as SSLProxyingJsonObj
  };
}

export default SSLProxyingConfigFetcher;
