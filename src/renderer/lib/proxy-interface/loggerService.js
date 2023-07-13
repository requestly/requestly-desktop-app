import { ipcRenderer } from "electron";
class LoggerService {
  addLog = (log, requestHeaders) => {
    ipcRenderer.send("log-network-request-v3", log);
  };
}

export default LoggerService;
