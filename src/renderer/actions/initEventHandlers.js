/** Babel */
import "core-js/stable";
import "regenerator-runtime/runtime";
// CORE
import { ipcRenderer, shell } from "electron";
// ACTION
import startProxyServer from "./proxy/startProxyServer";
import getProxyConfig from "./proxy/getProxyConfig";
import { activateApp, deactivateApp, isAppActivatable } from "./apps";
import saveRootCert from "./saveRootCert";
// STATE MANAGEMENT
import { setState } from "./stateManagement";
// UTILS
import { filterSuperObjectByType } from "../utils/storage";
// CONSTANTS
import { CONSTANTS as GLOBAL_CONSTANTS } from "@requestly/requestly-core";
// SENTRY
import * as Sentry from "@sentry/browser";
import { getCertStatus } from "./apps/os/ca/utils";
import { getProxyStatus } from "./apps/os/proxy/utils";
import { staticConfig } from "../config";
import { installCert } from "./apps/os/ca";
import { applyProxy } from "./apps/os/proxy";
import { shutdown } from "./shutdown";
import storageCacheService from "renderer/services/storage-cache";
import { getAvailableAndroidDevices } from "./apps/mobile/utils";
import { sendMessageToExtension } from "./helperSocketServer";
import IosSimulatorDevice from "./apps/mobile/iosSimulator";


const initEventHandlers = () => {
  ipcRenderer.send("background-process-started", "Testing");
  ipcRenderer.on("start-proxy-server", async () => {
    const PROXY_RESULT = await startProxyServer();
    ipcRenderer.send("reply-start-proxy-server", PROXY_RESULT);
    ipcRenderer.send("proxy-config-updated", getProxyConfig());
  });

  ipcRenderer.on("detect-available-apps", async (event, payload) => {
    const arrayOfAppIds = payload;
    let final_result = {};

    for (let appId of arrayOfAppIds) {
      isAppActivatable({ id: appId })
        .then((result) => {
          final_result[appId] = result;
          ipcRenderer.invoke("app-detected", {
            // Send each result to main process which further forwards it to UI
            id: appId,
            isAppActivatable: result,
          });
        })
        .catch((e) => console.error("Unexpected Behaviour", e));
    }

    ipcRenderer.send("reply-detect-available-apps", final_result);
  });

  ipcRenderer.on("detect-available-android-devices", async (event, payload) => {
    let devices = [];
    try {
      devices = await getAvailableAndroidDevices();
    } catch (err) {
      // TODO: Handle Errors
    }
    ipcRenderer.send("reply-detect-available-android-devices", devices);
  });

  ipcRenderer.on("detect-available-ios-simulators", async () => {
    try {
      const result = await IosSimulatorDevice.getAvailableSimulators();
      ipcRenderer.send("reply-detect-available-ios-simulators", result);
    } catch (error) {
      console.log("Error while detecting iOS simulators", error);
      ipcRenderer.send("reply-detect-available-ios-simulators", {});
    }
  });

  ipcRenderer.on("activate-app", async (event, payload) => {
    const { id, options } = payload;
    let res = { success: false };

    try {
      /* (Checking -> Installing) cert on every app launch, so that launched
       * browsers also trust the self signed certificate (RQProxyCA).
       * Otherwise, browsers complain that the session in not secure */
      const _certInstallResult = await installCert(staticConfig.ROOT_CERT_PATH);

      res = await activateApp({ id, options });
    } catch (err) {
      Sentry.captureException(err);
      console.error(err.message);
    }
    ipcRenderer.send("reply-activate-app", res);
  });

  ipcRenderer.on("deactivate-app", async (event, payload) => {
    const { id, options } = payload;
    let res = { success: false };
    try {
      res = await deactivateApp({ id, options });
    } catch (err) {
      Sentry.captureException(err);
      console.error(err.message);
    }
    ipcRenderer.send("reply-deactivate-app", res);
  });

  ipcRenderer.on("save-root-cert", async () => {
    let res = { success: false };
    try {
      res = await saveRootCert();
    } catch (err) {
      Sentry.captureException(err);
      console.error(err.message);
    }
    ipcRenderer.send("reply-save-root-cert", res);
  });

  ipcRenderer.on("system-wide-cert-status", async () => {
    const res = getCertStatus();
    ipcRenderer.send("reply-system-wide-cert-status", res);
  });

  ipcRenderer.on("system-wide-cert-trust", async () => {
    const res = await installCert(staticConfig.ROOT_CERT_PATH);
    ipcRenderer.send("reply-system-wide-cert-trust", res);
  });

  ipcRenderer.on("system-wide-proxy-status", async () => {
    const res = getProxyStatus();
    ipcRenderer.send("reply-system-wide-proxy-status", res);
  });

  ipcRenderer.on("system-wide-proxy-start", async () => {
    const res = applyProxy();
    ipcRenderer.send("reply-system-wide-proxy-start", res);
  });

  ipcRenderer.on("open-external-link", async (event, payload) => {
    if (payload && payload.link) {
      shell.openExternal(payload.link);
    }
  });

  ipcRenderer.on("primary-storage-updated", (event, payload) => {
    // Purge cache
    const allNewRecords = payload;
    const newRules = filterSuperObjectByType(
      allNewRecords,
      GLOBAL_CONSTANTS.OBJECT_TYPES.RULE
    );
    const newGroups = filterSuperObjectByType(
      allNewRecords,
      GLOBAL_CONSTANTS.OBJECT_TYPES.GROUP
    );
    // setState("primaryStorageCache", newVal);
    // Update: Refresh rules only
    setState("groupsCache", newGroups);
    setState("rulesCache", newRules);
  });

  ipcRenderer.on("shutdown", async () => {
    await shutdown();
    ipcRenderer.send("shutdown-success");
  });

  ipcRenderer.on("rq-storage:storage-updated", async (event, payload) => {
    storageCacheService.updateCache(payload?.storeName);
  });

  ipcRenderer.on("disconnect-extension", async (event, payload) => {
    sendMessageToExtension(payload.clientId, {
      action: "disconnect-extension",
      appId: payload.appId,
    });
    ipcRenderer.send("reply-disconnect-extension", { success: true });
  });
};

export default initEventHandlers;
