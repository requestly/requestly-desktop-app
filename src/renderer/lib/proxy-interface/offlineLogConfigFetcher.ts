import { STORE_NAME } from "lib/storage/constants";
import {LogConfig} from "lib/storage/types/offline-log-config";
import storageCacheService from "renderer/services/storage-cache";
import BaseConfigFetcher from "./base";

/* 
    NOT USED, IMPLEMENTED FOR COMPLETENESS, 
    CALLING storageCacheService.getCache INSIDE A UTILITY FUNCTION
*/
class OfflineLogConfigFetcher implements BaseConfigFetcher {
  getConfig = (): LogConfig => {
    return storageCacheService.getCache(STORE_NAME.OFFLINE_LOG_CONFIG) as LogConfig
  };
}

export default OfflineLogConfigFetcher
