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
import { app, BrowserWindow, shell, dialog, Tray, Menu, clipboard } from "electron";

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

let tray: Tray | null = null;

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "assets")
  : path.join(__dirname, "../../assets");

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

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

export default function createTrayMenu(ip?: string, port?: number) {
  if(tray) { // tray is recreated when proxy parameters are ready
    tray.destroy();
    tray = null
  }
  const proxyAddress = `${ip}:${port}`;
  const menuOptions: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Show Requestly",
      click: () => {
        if(webAppWindow) {
          if(webAppWindow.isMinimized()) {
            webAppWindow.restore()
          }
          webAppWindow.show();
          webAppWindow.focus();
        }
      },
    },
    {
      type: "separator",
    },
    {
      label: `Listening On ${proxyAddress}`, // todo: get actual ip and port
      submenu: [
        {
          label: "Copy",
          click: () => {
            clipboard.writeText(proxyAddress);
          },
        },
        {
          label: "Copy IP",
          click: () => {
            clipboard.writeText(ip ?? "");
          },
        },
        {
          label: "Copy Port",
          click: () => {
            clipboard.writeText(port?.toString() ?? "");
          },
        },
      ],
    },
    {
      type: "separator",
    },
    {
      label: "📖 Documentation",
      click: () => {
        // todo: get link from constants
        const documentationURL = "https://docs.requestly.io";
        shell.openExternal(documentationURL);
      },
    },
    {
      label: "🐞 Report an Issue",
      click: () => {
        const issueURL = "https://github.com/requestly/requestly/issues/new/choose";
        shell.openExternal(issueURL);
      },
    },
    {
      label: "⭐ Give us a Star",
      click: () => {
        const repoURL = "https://github.com/requestly/requestly/";
        shell.openExternal(repoURL);
      },
    },
    {
      type: "separator",
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]

  if(!ip || !port) { // for case when proxy is not ready
    menuOptions.splice(1,2)
  }
  const trayMenu = Menu.buildFromTemplate(menuOptions);

  if(process.platform === "win32") {
    tray = new Tray(getAssetPath("iconTemplate@2x.ico"));
  } else {
    tray = new Tray(getAssetPath("iconTemplate.png"));
  }
  tray.setToolTip("Requestly App");
  tray.setContextMenu(trayMenu);
}


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
      sandbox: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  new AutoUpdate(webAppWindow);
  remote.enable(webAppWindow.webContents);

  // TODO @sahil: Prod and Local Urls should be supplied by @requestly/requestly-core-npm package.
  const DESKTOP_APP_URL = isDevelopment
    ? "http://localhost:3000"
    : "https://app.requestly.io";
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
  createTrayMenu();

  // Open urls in the user's browser
  webAppWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' }
  });
};

// custom protocol (requestly) handler
app.on("open-url", (_event, rqUrl) => {
  webAppWindow?.show();
  webAppWindow?.focus();
  const url = new URL(rqUrl);
  // note: currently action agnostic, because it is only meant for redirection for now
  if(url.searchParams.has("route")) {
    const route = url.searchParams.get("route")
    webAppWindow?.webContents.send("deeplink-handler", route)
  }
})

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

    if (process.platform === 'win32') {
      // Set the path of electron.exe and your app.
      // These two additional parameters are only available on windows.
      // Setting this is required to get this working in dev mode.
      app.setAsDefaultProtocolClient('requestly', process.execPath, [path.resolve(process.argv[1])]);
    } else {
      app.setAsDefaultProtocolClient('requestly');
    }
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
