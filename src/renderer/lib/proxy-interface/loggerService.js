import { ipcRenderer } from "electron";
class LoggerService {
  addLog = (log, requestHeaders) => {
    console.log("Interface addLog");
    ipcRenderer.send("log-network-request-v2", log);
  };
}

export default LoggerService;
