import { ipcRenderer } from "electron";
import { STORE_NAME } from "lib/storage/constants";
import storageCacheService from "renderer/services/storage-cache";
import fs from "fs";
import path from "path";


function saveLogToOfflineStore(log) {
  const logConfig = storageCacheService.getCache(STORE_NAME.OFFLINE_LOG_CONFIG)

  if(!log || !logConfig || log.requestState !== "COMPLETE") {
    return;
  }

  if (logConfig.isEnabled) {
    const logFilePath = getFilePathFromLogConfig(logConfig);
    if (logFilePath && doesLogMatchConfig(log, logConfig)) {
      addLogToFile(log, logFilePath);
    }
  }

  function getFilePathFromLogConfig(logConfig) {
    if (logConfig && logConfig.storePath) {
      const fileName = getFormattedDate() + ".jsonl";
      const filePath = logConfig.storePath + "/" + fileName;
      return filePath;
    }
    return null;

    // dd-mm-yyyy
    function getFormattedDate() {
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
  }

  function doesLogMatchConfig(log, logConfig) {
    const logURL = getURLFromLog(log);
    if(logURL) {
      const configFilters = logConfig.filter;
      if (configFilters) {
        const isURLMatched = configFilters.some((filter) => {
          return logURL.includes(filter);
        });
        return isURLMatched;
      }
    }
    return false;
    function getURLFromLog(log) {
      const logEntry = log.finalHar?.log?.entries?.[0]
      if (logEntry) {
        const url = logEntry.request?.url;
        return url;
      }
      return null;
    }
  }

  function addLogToFile(log, filePath) {
    try {
      const logFileDir = path.dirname(filePath);
      if (!fs.existsSync(logFileDir)) return;

      fs.appendFile(filePath, `${JSON.stringify(log)} \n`, (err) => {
        if (err) {
          console.error("Error writing to log file:", err);
        } 
      });
    } catch (error) {
      console.error("Error writing to log file:", error);
    }
  }
}

class LoggerService {
  addLog = (log, requestHeaders) => {

    // send log to webapp
    ipcRenderer.send("log-network-request-v2", log);

    // save to file if config is preset
    saveLogToOfflineStore(log);
  };
}

export default LoggerService;
