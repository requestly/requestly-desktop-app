// ACTIONS
import { buildApps } from "./appManager";
// UTILS
import { delay, returnWithFallback } from "../../utils/misc";
// CONFIG
import { staticConfig } from "../../config";
// SENTRY
import * as Sentry from "@sentry/browser";
import { getLauncher } from "./browsers/browser-handler";
import { appLaunchErrorTypes, createError } from "../../lib/errors";

const config = {
  appName: staticConfig.APP_NAME,
  configPath: staticConfig.BROWSER_CONFIG_PATH,
  https: {
    certPath: staticConfig.ROOT_CERT_PATH,
  },
};

let apps = buildApps(config);

const APP_TIMEOUT = 15000;

export const activateApp = async ({ id, proxyPort, options }) => {
  // Log
  console.log(`Activating ${id}`, { category: "app", data: { id, options } });

  const app = apps[id];
  if (!app) throw createError(`Unknown app ${id}`,appLaunchErrorTypes.MISC);

  // After 30s, don't stop activating, but report an error if we're not done yet
  let activationDone = false; // Flag to keep track

  delay(30000).then(() => {
    if (!activationDone) console.error(`Timeout activating ${id}`);
  });

  const result = { success: true, metadata: null, err: null }

  await app.activate(proxyPort, options)
  .then(metadata => {
    result.metadata = metadata
    console.log(`Successfully activated ${id}`, { category: "app" });
  })
  .catch((err) => {
    // apps like safari activate system proxy and fail on launch
    // hence they need to be deactivated
    deactivateApp({id, proxyPort})

    result.success = false

    if(err.metadata) {
      result.metadata = err.metadata
    }

    // for cases when `err` is just the stderr output string
    // happens in case when unable to launch safari
    if (!(err instanceof Error)) {
      const errMsg = err?.toString() ? err?.toString() :  "Unexpected behaviour";
      result.err = createError(errMsg, appLaunchErrorTypes.APP_ACTIVATION_FAILED)
    } else {
      result.err = err
    }

    // Because chromium render process sanitizes the errors when recieved from IPC
    // only allows name, message, selected types, and stack trace
    // https://github.com/electron/electron/issues/24427
    result.metadata = {...result.metadata, cause: result.err.cause}

    Sentry.captureException(result.err);
    console.error(result.err);
  });

  // Set flag
  activationDone = true;

  return result
};

export const deactivateApp = async ({ id, proxyPort }) => {
  const app = apps[id];
  if (!app) throw createError(`Unknown app ${id}`, appLaunchErrorTypes.APP_DEACTIVATE_FAILED);

  await app.deactivate(proxyPort).catch((e) => {
    Sentry.captureException(e);
    console.error(e.message);
  });

  return { success: !(await app.isActive(proxyPort)) };
};

export const isAppActivatable = ({ id }) => {
  const app = apps[id];
  if (!app) {
    console.log("Requested app doesnt exist", id);
    if (id == "android") return new Promise((resolve) => resolve(true)); // @nsr Fix Hack
    return new Promise((resolve) => resolve(false));
  }
  return returnWithFallback(app.isActivable(), APP_TIMEOUT, false);
};

export const areAppsActivatable = async (arrayOfAppIds = []) => {
  const areAppsActivatablePromiseArray = [];
  arrayOfAppIds.forEach((appId) => {
    areAppsActivatablePromiseArray.push(isAppActivatable({ id: appId }));
  });
  const objectToReturn = {};
  return Promise.all(areAppsActivatablePromiseArray)
    .then((allResArr) => {
      allResArr.forEach(
        (result, index) => (objectToReturn[arrayOfAppIds[index]] = result)
      );
      return objectToReturn;
    })
    .catch((err) => {
      Sentry.captureException(err);
    });
};

export const isAppActive = ({ id, proxyPort }) => {
  const app = apps[id];
  try {
    return app.isActive(proxyPort);
  } catch (error) {
    Sentry.captureException(error);
    console.error(error.message);
    return false;
  }
};

export const initAppManager = () => {
  getLauncher(config.configPath);
};

// const selectedApp = "electron";
// let isSelectedAppActivatable = false;

// isAppActivatable({ id: selectedApp })
//   .then((res) => {
//     console.log("isAppActivatable", res);
//     isSelectedAppActivatable = true;
//   })
//   .catch((err) => console.error(err.message));

// setTimeout(() => {
//   const res = isAppActive({ id: selectedApp, proxyPort: 8081 });
//   console.log("isAppActive", res);
// }, 5000);

// setTimeout(() => {
//   if (!isSelectedAppActivatable) return;
//   activateApp({
//     id: selectedApp,
//     proxyPort: 8081,
//     options: {
//       pathToApplication: "/Applications/Spotify.app",
//     },
//   })
//     .then((res) => console.log(res))
//     .catch((err) => console.error(err.message));
// }, 10000);

// setTimeout(() => {
//   const res = isAppActive({ id: selectedApp, proxyPort: 8081 });
//   console.log("isAppActive", res);
// }, 17000);
