import { ipcRenderer } from "electron";
class LoggerService {
  addLog = (log, requestHeaders) => {
    ipcRenderer.send("log-network-request-v2", log);
  };
}

export default LoggerService;
