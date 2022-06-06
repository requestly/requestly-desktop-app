// UTILS
const ip = require("ip");

import { RQProxyProvider } from "rq-proxy";
import RulesDataSource from "../lib/proxy-interface/rulesFetcher";
import LoggerService from "../lib/proxy-interface/loggerService";

import userPreferenceManager from "../utils/userPreferencesManager";
import getNextAvailablePort from "./getNextAvailablePort";
// CONFIG
import { staticConfig } from "../config";
// SENTRY
import * as Sentry from "@sentry/browser";
import startHelperServer from "./startHelperServer";

const { CERTS_PATH, ROOT_CERT_PATH } = staticConfig;
// Load user preferences
const DEFAULT_PROXY_PORT = userPreferenceManager.getProxyDefaultPort();
const DEFAULT_HELPER_SERVER_PORT = 7040;

const startProxyServer = async () => {
  // // Check if proxy is already listening. If so, close it
  // try {
  //   window.proxy.close();
  //   logger.log("A proxy server was closed");
  // } catch (error) {
  //   Sentry.captureException(error);
  //   logger.log("A proxy server close req was made but no proxy was up");
  // }

  // start the proxy server
  const FINAL_PROXY_PORT = await getNextAvailablePort(DEFAULT_PROXY_PORT);
  if (!FINAL_PROXY_PORT) return { success: false };

  // await doStartProxy(FINAL_PROXY_PORT);
  startProxyFromModule(FINAL_PROXY_PORT);

  // start the helper server
  const HELPER_SERVER_PORT = await getNextAvailablePort(
    DEFAULT_HELPER_SERVER_PORT
  );
  if (!HELPER_SERVER_PORT) return { success: false };
  await startHelperServer(HELPER_SERVER_PORT);

  const proxyIp = ip.address();
  return {
    success: true,
    port: FINAL_PROXY_PORT,
    proxyIp,
    helperServerPort: HELPER_SERVER_PORT,
  };
};

// let isRestart = false;

// let doStartProxy = async (FINAL_PROXY_PORT) => {
//   return new Promise((resolve) => {
//     window.proxy.listen(
//       {
//         port: FINAL_PROXY_PORT,
//         sslCaDir: CERTS_PATH,
//         host: "0.0.0.0",
//       },
//       async (err) => {
//         err && logger.log(err);
//         // HACK: PEMInvalid  hotfix. Since blank pem file saved. Remove this later with permanent fix
//         if (err && !isRestart) {
//           logger.log("Resetting Certs and Retrying");
//           isRestart = true;
//           logger.log("Removing existing certs");
//           const deleteOldCertsResult = deleteItem(CERTS_PATH);
//           logger.log("Success", deleteOldCertsResult);
//           logger.log("Trying to start proxy again");
//           doStartProxy(FINAL_PROXY_PORT);
//         } else {
//           await proxy_middleware.init({ [MIDDLEWARE_TYPE.LOGGER]: false });
//           resolve(true);
//         }
//       }
//     );
//   });
// };

function startProxyFromModule(PROXY_PORT) {
  const proxyConfig = {
    port: PROXY_PORT,
    // @ts-ignore
    certPath: CERTS_PATH,
    rootCertPath: ROOT_CERT_PATH,
  };
  RQProxyProvider.createInstance(
    proxyConfig,
    new RulesDataSource(),
    new LoggerService()
  );

  // Helper server needs http port, hence
  window.proxy = RQProxyProvider.getInstance().proxy;
}

export default startProxyServer;
