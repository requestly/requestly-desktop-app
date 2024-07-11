import * as _ from "lodash";
// ACTIONS
import { buildApps } from "./appManager";
// UTILS
import { delay, returnWithFallback } from "../../utils/misc";
// CONFIG
import { staticConfig } from "../../config";
// SENTRY
import { readFileSync } from "fs";
import * as Sentry from "@sentry/browser";
import { getLauncher } from "./browsers/browser-handler";
import { getCurrentProxyPort } from "../storage/cacheUtils";

const config = {
  appName: staticConfig.APP_NAME,
  configPath: staticConfig.BROWSER_CONFIG_PATH,
  https: {
    certPath: staticConfig.ROOT_CERT_PATH,
    certContent: readFileSync(staticConfig.ROOT_CERT_PATH, "utf8"),
  },
};

let apps = buildApps(config);

const APP_TIMEOUT = 15000;

const isActivationError = (value) => _.isError(value);

export const activateApp = async ({ id, proxyPort, options }) => {
  // Log
  console.log(`Activating ${id}`, { category: "app", data: { id, options } });

  const app = apps[id];
  if (!app) throw new Error(`Unknown app ${id}`);

  const targetPort = proxyPort ? proxyPort : getCurrentProxyPort();

  // After 30s, don't stop activating, but report an error if we're not done yet
  let activationDone = false; // Flag to keep track

  delay(30000).then(() => {
    if (!activationDone) console.error(`Timeout activating ${id}`);
  });

  const result = await app.activate(targetPort, options).catch((err) => {
    Sentry.captureException(err);
    console.error(err.message);
    return err;
  });

  // Set flag
  activationDone = true;

  if (isActivationError(result)) {
    if (result.reportable !== false) console.error(result);
    return {
      success: false,
      metadata: { ...result.metadata, message: result?.message },
    };
  } else {
    console.log(`Successfully activated ${id}`, { category: "app" });
    return { success: true, metadata: result };
  }
};

export const deactivateApp = async ({ id, proxyPort, options }) => {
  const app = apps[id];
  if (!app) throw new Error(`Unknown app ${id}`);

  const targetPort = proxyPort ? proxyPort : getCurrentProxyPort();

  await app.deactivate(targetPort, options).catch((e) => {
    Sentry.captureException(e);
    console.error(e.message);
  });

  return { success: !(await app.isActive(targetPort)) };
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
