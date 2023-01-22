/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import "core-js/stable";
import "regenerator-runtime/runtime";
import path from "path";
import { app, BrowserWindow, shell, dialog } from "electron";
// @ts-expect-error
import { CONSTANTS as GLOBAL_CONSTANTS } from "@requestly/requestly-core";
import MenuBuilder from "./menu";
import {
  registerMainProcessCommonEvents,
  registerMainProcessEvents,
  registerMainProcessEventsForWebAppWindow,
} from "./events";
/** Storage - State */
import "./actions/initGlobalState";
import AutoUpdate from "../lib/autoupdate";
import { cleanupAndQuit } from "./actions/cleanup";

// Init remote so that it could be consumed in renderer
const remote = require("@electron/remote/main");
remote.initialize();

// Browser windows
let webAppWindow: BrowserWindow | null = null;
let loadingScreenWindow: BrowserWindow | null = null;

const isDevelopment =
  process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true";

if (isDevelopment) {
  const sourceMapSupport = require("source-map-support");
  sourceMapSupport.install();
}

if (isDevelopment) {
  require("electron-debug")();
}

const installExtensions = async () => {
  const installer = require("electron-devtools-installer");
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ["REACT_DEVELOPER_TOOLS", "REDUX_DEVTOOLS"];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, "assets")
    : path.join(__dirname, "../../assets");

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  webAppWindow = new BrowserWindow({
    show: false,
    width: 1310,
    minWidth: 1100,
    height: 600,
    minHeight: 500,
    icon: getAssetPath("icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      nativeWindowOpen: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  new AutoUpdate(webAppWindow);
  remote.enable(webAppWindow.webContents);

  // TODO @sahil: Prod and Local Urls should be supplied by @requestly/requestly-core-npm package.
  const DESKTOP_APP_URL = isDevelopment
    ? "http://localhost:3000"
    : GLOBAL_CONSTANTS.DESKTOP_APP_URL;
  webAppWindow.loadURL(DESKTOP_APP_URL, {
    extraHeaders: "pragma: no-cache\n",
  });

  // @ts-ignore
  webAppWindow.webContents.once("did-fail-load", (event, errorCode, errorDescription, validatedUrl, isMainFrame, frameProcessId, frameRoutingId) => {
    if(isMainFrame) {
      console.error(`did-fail-load errorCode=${errorCode} url=${validatedUrl}`);
      if (webAppWindow) webAppWindow.hide();
      dialog.showErrorBox(
        "No internet",
        "Unable to connect to Requestly servers. Make sure you're connected to the internet or try removing any active proxy."
      );
      app.quit();
    }
  });

  webAppWindow.once("ready-to-show", () => {
    if (!webAppWindow) {
      throw new Error("Not expecting this to happen!");
    }
    if (process.env.START_MINIMIZED) {
      webAppWindow.minimize();
    } else {
      // Show Web app
      webAppWindow.maximize();
      // webAppWindow.setResizable(false);
      webAppWindow.show();
      webAppWindow.focus();
    }

    // Close loading splash screen
    if (loadingScreenWindow) {
      loadingScreenWindow.hide();
      loadingScreenWindow.close();
    }
  });

  // webAppWindow.on('closed', () => {
  //   webAppWindow = null;
  // });

  webAppWindow.on("close", (e) => {
    // Check if user has already asked to Quit app from here or somewhere else
    // @ts-expect-error
    if (global.isQuitActionConfirmed) {
      app.quit();
      return;
    }

    if (webAppWindow) {
      let message =
        "Do you really want to quit? This would also stop the proxy server.";

      // @ts-expect-error
      if (global.quitAndInstall) {
        message = "Confirm to restart & install update";
        // @ts-expect-error
        global.quitAndInstall = false;
      }

      const choice = dialog.showMessageBoxSync(webAppWindow, {
        type: "question",
        buttons: ["Yes, quit Requestly", "Minimize instead", "Cancel"],
        title: "Quit Requestly",
        message: message,
      });

      switch (choice) {
        // If Quit is clicked
        case 0:
          // Set flag to check next iteration
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          global.isQuitActionConfirmed = true;
          // Calling app.quit() would again invoke this function
          e.preventDefault();
          cleanupAndQuit();
          break;
        // If Minimize is clicked
        case 1:
          webAppWindow.minimize();
          e.preventDefault();
          break;
        // If cancel is clicked
        case 2:
          e.preventDefault();
          break;
        default:
          break;
      }
    }
  });

  const enableBGWindowDebug = () => {
    // Show bg window and toggle the devtools
    try {
      // Suppress Global object warnings
      const globalAny: any = global;

      // eslint-disable-next-line
      if (globalAny.backgroundWindow) {
        // Show Window
        // eslint-disable-next-line
        globalAny.backgroundWindow.show();
        // eslint-disable-next-line
        globalAny.backgroundWindow.webContents.toggleDevTools();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const menuBuilder = new MenuBuilder(webAppWindow, enableBGWindowDebug);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  webAppWindow.webContents.on("new-window", (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // Init loading screen
  loadingScreenWindow = new BrowserWindow({
    width: 200,
    height: 200,
    /// remove the window frame, so it will become a border-less window
    frame: false,
    /// and set the transparency, to remove any window background color
    transparent: true,
  });
  // User should not allow resizing it
  loadingScreenWindow.setResizable(false);

  loadingScreenWindow.once("show", async () => {
    // DO actual stuff
    // Register Basic IPC Events
    registerMainProcessEvents();
    // Create Renderer Window
    await createWindow();
    // Register Remaining IPC Events that involve browser windows
    registerMainProcessEventsForWebAppWindow(webAppWindow);
    registerMainProcessCommonEvents();
  });
  loadingScreenWindow.loadURL(
    `file://${path.resolve(__dirname, "../loadingScreen/", "index.html")}`
  );
  loadingScreenWindow.show();
});

// Dont use any proxy
app.commandLine.appendSwitch("no-proxy-server");

/**
 * Add event listeners...
 */

app.on("window-all-closed", () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  // if (process.platform !== 'darwin') {
  //   app.quit();
  // }

  // Hotfix- New window cant be recreated, better quit
  app.quit();
});

app
  .whenReady()
  .then(() => {
    app.on("activate", () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((err) => {
    console.log(err);
  });
