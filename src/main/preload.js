/* eslint-disable func-names */
/** Babel */
require("core-js/stable");
require("regenerator-runtime/runtime");
// Core
const { contextBridge, ipcRenderer } = require("electron");
const { app } = require("@electron/remote");

const DesktopStorageService = require("./preload-apis/DesktopStorageService");
// Sub
const IPC = require("./preload-apis/IPC");
const STATE_MANAGEMENT = require("./preload-apis/AppState");

let appVersion = null;
const isSetappBuild = process.env.IS_SETAPP_BUILD === "true";

if (process.env.NODE_ENV === "development") {
  appVersion = require("../../package.json").version;
} else {
  appVersion = app.getVersion();
}

(function (window) {
  // Build the RQ object
  const RQ = window.RQ || {};
  RQ.DESKTOP = RQ.DESKTOP || {};

  // Application Info
  RQ.MODE = "DESKTOP";
  // TODO @Sachin: TMP VERSION as of now
  RQ.DESKTOP.VERSION = appVersion || "1.0";
  RQ.DESKTOP.IS_SETAPP_BUILD = isSetappBuild;
  // Services
  RQ.DESKTOP.SERVICES = RQ.DESKTOP.SERVICES || {};
  // Services - Storage Service
  RQ.DESKTOP.SERVICES.STORAGE_SERVICE = new DesktopStorageService();
  // Services - App State
  RQ.DESKTOP.SERVICES.STATE_MANAGEMENT = STATE_MANAGEMENT;
  // Services - IPC
  RQ.DESKTOP.SERVICES.IPC = IPC;

  module.paths.push('/Users/rahulramteke/projects/adhoc/nt/node_modules');
  eval("const arc = require('arcjet'); console.log('aaarrcc', arc)")
  // Expose to frontend
  contextBridge.exposeInMainWorld("RQ", RQ);
  // contextBridge.exposeInMainWorld("rqEval", (s) => {eval(s)});

  /**
   * Cap'n Web RPC Bridge
   *
   * This is a minimal transport bridge for Cap'n Web RPC.
   * The web app (app.requestly.io) can use this to create its own RpcSession.
   *
   * Usage in web app:
   *   const transport = new WebAppTransport(); // implements RpcTransport using window.rpcBridge
   *   const session = new RpcSession(transport);
   *   const api = session.getRemoteMain();
   *   await api.greet("World");
   */
  contextBridge.exposeInMainWorld("rpcBridge", {
    /**
     * Send a message to the Background Window (via Main Process relay)
     * @param {string} message - The serialized RPC message
     */
    send: (message) => {
      console.log('aaa', message);
      ipcRenderer.send("capnweb-to-bg", message);
    },

    /**
     * Subscribe to messages from the Background Window
     * @param {function} callback - Called with each incoming message
     * @returns {function} Unsubscribe function
     */
    subscribe: (callback) => {
      const handler = (_event, message) => callback(message);
      ipcRenderer.on("capnweb-from-bg", handler);
      // Return unsubscribe function for cleanup
      return () => {
        ipcRenderer.removeListener("capnweb-from-bg", handler);
      };
    },
  });

  console.log("[Preload] rpcBridge exposed for Cap'n Web RPC");

})(window);

contextBridge.exposeInMainWorld("")
