import { ipcRenderer } from "electron";

class LoggerService {
  sendLogEvent = (log, requestHeaders) => {
    // TODO: change channel name to `network-log-event`
    ipcRenderer.send("log-network-request-v2", log);
  };
}

export default LoggerService;
