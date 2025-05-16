import { ipcRenderer } from "electron";
import { STORE_NAME } from "lib/storage/constants";
import storageCacheService from "renderer/services/storage-cache";
class LoggerService {
  addLog = (log, requestHeaders) => {

    // send log to webapp
    ipcRenderer.send("log-network-request-v2", log);

    // save to file if config is preset
    const logConfig = storageCacheService.getCache(STORE_NAME.OFFLINE_LOG_CONFIG)
    console.log("DBG: logConfig", logConfig);
  };
}

export default LoggerService;
