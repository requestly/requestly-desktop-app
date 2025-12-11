// UTILS
import { ip } from "address";

import { RQProxyProvider } from "@requestly/requestly-proxy";
import RulesDataSource from "../../lib/proxy-interface/rulesFetcher";

import getNextAvailablePort from "../getNextAvailablePort";
// CONFIG
import { staticConfig } from "../../config";
// SENTRY
import * as Sentry from "@sentry/browser";
import startHelperServer, { stopHelperServer } from "../startHelperServer";
import logger from "utils/logger";
import { getDefaultProxyPort } from "../storage/cacheUtils";
import { handleCARegeneration } from "../apps/os/ca/utils";
import {
  startHelperSocketServer,
  stopHelperSocketServer,
} from "../helperSocketServer";
import portfinder from "portfinder";
import LoggerService from "renderer/lib/proxy-interface/loggerService";
import { addShutdownHandler } from "../shutdown";

declare global {
  interface Window {
    proxy: any;
  }
}

interface IStartProxyResult {
  success: Boolean;
  port: number | null;
  proxyIp: any;
  helperServerPort?: any;
}

const { CERTS_PATH, ROOT_CERT_PATH } = staticConfig;

const DEFAULT_HELPER_SERVER_PORT = 7040;
const DEFAULT_SOCKET_SERVER_PORT = 59763;

function startProxyFromModule(PROXY_PORT: number) {
  const proxyConfig = {
    port: PROXY_PORT,
    // @ts-ignore
    certPath: CERTS_PATH,
    rootCertPath: ROOT_CERT_PATH,
    onCARegenerated: handleCARegeneration,
  };
  RQProxyProvider.createInstance(
    proxyConfig,
    new RulesDataSource(),
    new LoggerService()
  );
  window.proxy = RQProxyProvider.getInstance().proxy;
  console.log("DEBUG:", "Proxy assigned to window object");
}

export function stopProxyServer() {
  // on startup window.proxy comes undefined
  // but if refreshed or some earlier proxy was there it will show the proxy object
  console.log(
    "DEBUG:",
    `onStartup window.proxy is undefined, else not: ${window.proxy}`
  );
  if (window.proxy) {
    console.log(
      "DEBUG:",
      `onRefresh window.proxy will be there: ${window.proxy}`
    );
    window.proxy.close();
  }
}

// this automatically stops the old server before starting the new one
export default async function startProxyServer(
  proxyPort?: number,
  shouldStartHelperServer = true
): Promise<IStartProxyResult> {
  // Check if proxy is already listening. If so, close it
  try {
    console.log("DEBUG:", "stopProxyServerCalled");
    stopProxyServer();
    logger.log("A proxy server was closed");
  } catch (error) {
    Sentry.captureException(error);
    logger.log("A proxy server close req was made but no proxy was up");
  }
  const proxyIp = ip()!;
  const targetPort = proxyPort || getDefaultProxyPort();

  const result: IStartProxyResult = {
    success: true,
    port: targetPort,
    proxyIp,
  };

  // start the proxy server
  const FINAL_PROXY_PORT = await getNextAvailablePort(targetPort);
  console.log("DEBUG: Is FINAL_PROXY_PORT is available", FINAL_PROXY_PORT);
  if (!FINAL_PROXY_PORT) {
    console.log("DEBUG: returning success as false");
    result.success = false;
    return result;
  }
  result.port = FINAL_PROXY_PORT;

  global.rq.proxyServerStatus = { port: FINAL_PROXY_PORT };

  startProxyFromModule(result.port);

  // start the helper server if not already running
  if (shouldStartHelperServer) {
    // No proxy comes for the case when there is success is false in result
    console.log("DEBUG:", "starting up the helper server");
    const HELPER_SERVER_PORT = await getNextAvailablePort(
      DEFAULT_HELPER_SERVER_PORT
    );

    result.helperServerPort = HELPER_SERVER_PORT;

    if (!HELPER_SERVER_PORT) {
      console.log(
        "DEBUG: returning success as false as no helper server port available"
      );
      result.success = false;
      return result;
    }
    await startHelperServer(HELPER_SERVER_PORT);
  }

  const HELPER_SOCKET_SERVER_PORT = await portfinder.getPortPromise({
    port: DEFAULT_SOCKET_SERVER_PORT,
    stopPort: DEFAULT_SOCKET_SERVER_PORT + 4, // 5 ports for fallback
  });
  console.log(
    "DEBUG:",
    `${HELPER_SOCKET_SERVER_PORT} HELPER_SOCKET_SERVER_PORT is available`
  );
  startHelperSocketServer(HELPER_SOCKET_SERVER_PORT);

  // fix-me: this does not remove existing handlers when restarting.
  // For now that doesn't have side effects
  addShutdownHandler(() => {
    stopProxyServer();
    stopHelperServer();
    stopHelperSocketServer();
  });

  return result;
}
