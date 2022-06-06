import * as path from "path";
const { promisify } = require("es6-promisify");
import * as getBrowserLauncherCbObject from "@httptoolkit/browser-launcher";
import {
  LaunchOptions,
  BrowserInstance,
  Browser,
  update as updateBrowserCacheCb,
} from "@httptoolkit/browser-launcher";
// ACTIONS
import { readFile, deleteFile } from "../../fileManagement";
// UTILS
import { delay } from "../../../utils/misc";
import * as _ from "lodash";
// SENTRY
import * as Sentry from "@sentry/browser";

const getBrowserLauncherCb = getBrowserLauncherCbObject.default;

const getBrowserLauncher = promisify(getBrowserLauncherCb);
const updateBrowserCache = promisify(updateBrowserCacheCb);

const browserConfigPath = (configPath) =>
  path.join(configPath, "browsers.json");

export { BrowserInstance, Browser };

export const checkBrowserConfig = async (configPath) => {
  // It's not clear why, but sometimes the browser config can become corrupted, so it's not valid JSON
  // If that happens browser-launcher can hit issues. To avoid that entirely, we check it here on startup.
  const browserConfig = browserConfigPath(configPath);
  try {
    const rawConfig = await readFile(browserConfig, "utf8");
    JSON.parse(rawConfig);
  } catch (error) {
    Sentry.captureException(error);
    if (error.code === "ENOENT") return;
    console.warn(
      `Failed to read browser config cache from ${browserConfig}, clearing.`,
      error
    );
    return deleteFile(browserConfig).catch((err) => {
      Sentry.captureException(err);
      // There may be possible races around here - as long as the file's gone, we're happy
      if (err.code === "ENOENT") return;
      console.error("Failed to clear broken config file:", err);
    });
  }
};

let launcher;

export const getLauncher = async (configPath) => {
  if (!launcher) {
    const browserConfig = browserConfigPath(configPath);
    launcher = getBrowserLauncher(browserConfig);
    launcher.then(async () => {
      // Async after first creating the launcher, we trigger a background cache update.
      // This can be *synchronously* expensive (spawns 10s of procs, 10+ms sync per
      // spawn on unix-based OSs) so defer briefly.
      await delay(2000);
      try {
        await updateBrowserCache(browserConfig);
        console.log("Browser cache updated");
        // Need to reload the launcher after updating the cache:
        launcher = getBrowserLauncher(browserConfig);
      } catch (e) {
        Sentry.captureException(e);
        console.log(e);
      }
    });
    // Reset & retry if this fails somehow:
    launcher.catch((e) => {
      Sentry.captureException(e);
      launcher = undefined;
    });
  }
  return launcher;
};

export const getAvailableBrowsers = async (configPath) => {
  return (await getLauncher(configPath)).browsers;
};

export { LaunchOptions };

export const launchBrowser = async (url, options, configPath) => {
  const launcher = await getLauncher(configPath);
  const browserInstance = await promisify(launcher)(url, options);
  browserInstance.process.on("error", (e) => {
    // If nothing else is listening for this error, this acts as default
    // fallback error handling: log & report & don't crash.
    if (browserInstance.process.listenerCount("error") === 1) {
      console.log("Browser launch error");
    }
  });
  return browserInstance;
};
