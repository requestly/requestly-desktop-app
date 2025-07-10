import { ipcRenderer } from "electron";
import fs from "fs";
import path from "path";
import { getLocalFileLogConfig } from "renderer/actions/storage/cacheUtils";
import logger from "utils/logger";


function saveLogToLocalFile(log) {
  if(!log || log.requestState !== "COMPLETE") return;

  const logConfig = getLocalFileLogConfig();

  if(!logConfig) return;

  if (logConfig.isEnabled) {
    const logFilePath = getFilePathFromLogConfig(logConfig);
    if (logFilePath && doesLogMatchConfig(log, logConfig)) {
      addLogToFile(log, logFilePath);
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
      if (!fs.existsSync(logFileDir)) {
        console.error("Log directory does not exist:", logFileDir);
        return;
      }

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

function getFilePathFromLogConfig(logConfig) {
  if (logConfig && logConfig.storePath) {
    const fileName = "interceptor_logs.jsonl";
    const filePath = logConfig.storePath + "/" + fileName;
    return filePath;
  }
  return null;
}

export function clearStoredLogs() {
  console.log("Clearing stored logs...");
  const logConfig = getLocalFileLogConfig();
  if (logConfig && logConfig.storePath) {
    const filePath = getFilePathFromLogConfig(logConfig);
    if (filePath && fs.existsSync(filePath)) {
      fs.truncate(filePath, 0, (err) => {
        if (err) {
          console.error("Error clearing log file:", err);
        } else {
          console.log("Log file cleared successfully.");
        }
      });
    }
  }
}

class LoggerService {
  addLog = (log, requestHeaders) => {
    try {
      // send log to webapp
      ipcRenderer.send("log-network-request-v2", log);
    } catch (error) {
      /* error only seen to happen during the app shutting down */
      logger.error("Error while sending network log - ", error)
    }

    try {
      // save to file if config is preset
      saveLogToLocalFile(log);
    } catch (error) {
      console.error("Error saving log to file:", error);
    }
  };
}

export default LoggerService;
