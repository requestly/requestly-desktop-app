import { dialog, ipcMain } from "electron";
/** ACTIONS */
import startBackgroundProcess from "./actions/startBackgroundProcess";
import { getState, setState } from "./actions/stateManagement";
import logNetworkRequest from "./actions/logNetworkRequest";
import logNetworkRequestV2 from "./actions/logNetworkRequestV2";
import getCurrentNetworkLogs from "./actions/getCurrentNetworkLogs";
import * as PrimaryStorageService from "./actions/initPrimaryStorage";
import storageService from "../lib/storage";
import {
  deleteNetworkRecording,
  getAllNetworkSessions,
  getSessionRecording,
  storeSessionRecording,
} from "./actions/networkSessionStorage";

// These events do not require the browser window
export const registerMainProcessEvents = () => {
  ipcMain.handle("start-background-process", startBackgroundProcess);
  /** Main Process State Management */
  ipcMain.handle("get-state", getState);
  ipcMain.handle("set-state", setState);
  /** Network Logs */
  ipcMain.handle("get-current-network-logs", getCurrentNetworkLogs);
  /** Storage Service */
  ipcMain.handle(
    "get-storage-super-object",
    PrimaryStorageService.getStorageSuperObject
  );
  ipcMain.handle("get-storage-object", (event, keyArg) =>
    PrimaryStorageService.getStorageObject(keyArg)
  );
  ipcMain.handle("set-storage-object", (event, objectArg) =>
    PrimaryStorageService.setStorageObject(objectArg)
  );
  ipcMain.handle("delete-item", (event, keyArg) =>
    PrimaryStorageService.deleteItem(keyArg)
  );
  ipcMain.handle("clear-storage", PrimaryStorageService.clearStorage);

  ipcMain.handle("rq-storage:storage-action", (event, storageAction) => {
    return storageService.processAction(storageAction);
  });
};

// These events require browser window
export const registerMainProcessEventsForWebAppWindow = (webAppWindow) => {
  // TODO: Remove this when all users shifted to 1.4.0.
  ipcMain.on("log-network-request", (event, message) =>
    logNetworkRequest(event, message, webAppWindow)
  );

  ipcMain.on("log-network-request-v2", (event, message) =>
    logNetworkRequestV2(event, message, webAppWindow)
  );

  // Open handle for async source detection
  ipcMain.handle("app-detected", async (event, payload) => {
    webAppWindow.send("app-detected", payload);
  });
  // Open handle for async browser close
  ipcMain.handle("browser-closed", async (event, payload) => {
    webAppWindow.send("browser-closed", payload);
  });

  // Open handle for async browser close
  ipcMain.handle("proxy-restarted", async (event, payload) => {
    webAppWindow.send("proxy-restarted", payload);
  });

  // hacky implementation for syncing addition and deletion
  const resendAllNetworkLogs = async () => {
    const res = await getAllNetworkSessions();
    webAppWindow.send("all-network-sessions", res);
  };

  ipcMain.handle("get-all-network-sessions", async () => {
    resendAllNetworkLogs();
  });

  ipcMain.handle("get-network-session", async (event, payload) => {
    const { id } = payload;
    const result = await getSessionRecording(id);
    return result;
  });

  ipcMain.handle("delete-network-session", async (event, payload) => {
    const { id } = payload;
    return deleteNetworkRecording(id);
  });

  ipcMain.handle("save-network-session", async (event, payload) => {
    const { har, name } = payload;
    const id = await storeSessionRecording(har, name);
    return id;
  });
};

export const registerMainProcessCommonEvents = () => {
  ipcMain.handle("open-file-dialog", async (event, options) => {
    const fileDialogPromise = dialog.showOpenDialog((options = {}));
    return fileDialogPromise;
  });
};
