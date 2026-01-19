/**
 * Cap'n Web Relay Setup
 *
 * This module sets up a simple message relay between the Web App Window and
 * Background Window for Cap'n Web RPC communication.
 *
 * The Main Process acts as a "dumb pipe" - it just forwards messages between
 * the two renderer processes. All RPC logic is handled by Cap'n Web on each end.
 *
 * Flow:
 *   Web App → Main (capnweb-to-bg) → Background
 *   Background → Main (capnweb-to-webapp) → Web App
 */

import { ipcMain, BrowserWindow } from "electron";

const CHANNELS = {
  // Web App → Background
  TO_BACKGROUND: "capnweb-to-bg",
  FROM_WEBAPP: "capnweb-from-webapp",

  // Background → Web App
  TO_WEBAPP: "capnweb-to-webapp",
  FROM_BACKGROUND: "capnweb-from-bg",
} as const;

/**
 * Sets up the relay from Web App Window to Background Window.
 * Call this when the Background Window is ready.
 */
export function setupCapnWebRelayToBackground(backgroundWindow: BrowserWindow) {
  ipcMain.on(CHANNELS.TO_BACKGROUND, (_event, message: string) => {
    // Forward message from Web App to Background
    if (backgroundWindow && !backgroundWindow.isDestroyed()) {
      console.log('bbb', message);
      backgroundWindow.webContents.send(CHANNELS.FROM_WEBAPP, message);
    } else {
      console.warn("[CapnWeb Relay] Background window not available, message dropped");
    }
  });

  console.log("[CapnWeb Relay] Relay to Background Window established");
}

/**
 * Sets up the relay from Background Window to Web App Window.
 * Call this when the Web App Window is ready.
 */
export function setupCapnWebRelayToWebApp(webAppWindow: BrowserWindow) {
  ipcMain.on(CHANNELS.TO_WEBAPP, (_event, message: string) => {
    // Forward message from Background to Web App
    if (webAppWindow && !webAppWindow.isDestroyed()) {
      webAppWindow.webContents.send(CHANNELS.FROM_BACKGROUND, message);
    } else {
      console.warn("[CapnWeb Relay] Web App window not available, message dropped");
    }
  });

  console.log("[CapnWeb Relay] Relay to Web App Window established");
}

/**
 * Export channel names for use in other modules
 */
export { CHANNELS as CAPNWEB_CHANNELS };
