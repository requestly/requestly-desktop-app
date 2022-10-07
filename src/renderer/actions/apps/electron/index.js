import * as _ from "lodash";
import { spawn } from "child_process";
import * as path from "path";
// import { getPortPromise as getPort } from "portfinder";
import { findExecutableInApp } from "@httptoolkit/osx-find-executable";
import * as Sentry from "@sentry/browser";
const CDP = require("chrome-remote-interface/index");
/** UTILS */
import generateSPKIFingerprint from "../../../utils/cert/generateSPKIFingerprint";
import { delay } from "../../../utils/misc";
/** ACTIONS */
import { readFile } from "../../fileManagement";
import { windowsClose } from "../../processManagement";
import {
  getTerminalEnvVars,
  OVERRIDES_DIR,
} from "../terminal/terminal-env-overrides";
import { appLaunchErrorTypes } from "renderer/lib/errors";

const isAppBundle = (path) => {
  return process.platform === "darwin" && path.endsWith(".app");
};

export class Electron {
  constructor(config) {
    this.config = config;
    this.id = "electron";
    this.version = "1.0.1";
    this.debugClients = {};
  }

  async isActivable() {
    return true;
  }

  isActive(proxyPort) {
    return (
      !!this.debugClients[proxyPort] && !!this.debugClients[proxyPort].length
    );
  }

  async activate(proxyPort, options) {
    // const debugPort = await getPort({ port: proxyPort });
    const debugPort = proxyPort;
    const { pathToApplication } = options;
    const cmd = isAppBundle(pathToApplication)
      ? await findExecutableInApp(pathToApplication)
      : pathToApplication;
    const appProcess = spawn(cmd, [`--inspect-brk=${debugPort}`], {
      stdio: "inherit",
      env: Object.assign(
        Object.assign(
          Object.assign({}, process.env),
          getTerminalEnvVars(proxyPort, this.config.https, process.env)
        ),
        {
          // We have to disable NODE_OPTIONS injection. If set, the Electron
          // app never fires paused(). I suspect because --require changes the
          // startup process somehow. Regardless, we don't need it (we're injecting
          // manually anyway) so we just skip it here.
          NODE_OPTIONS: "",
        }
      ),
    });
    let debugClient;
    let retries = 10;
    appProcess.on("error", async (e) => {
      console.error(e.message);
      if (debugClient) {
        // Try to close the debug connection if open, but very carefully
        try {
          await debugClient.close();
        } catch (e) {
          Sentry.captureException(e);
        }
      }
      // If we're still in the process of debugging the app, give up.
      retries = -1;
    });
    while (!debugClient && retries >= 0) {
      try {
        debugClient = await CDP({ port: debugPort });
      } catch (error) {
        if (error.code !== "ECONNREFUSED" || retries === 0) {
          throw error;
        }
        retries = retries - 1;
        await delay(500);
      }
    }
    if (!debugClient) throw new Error("Could not initialize CDP client", {cause: appLaunchErrorTypes.MISC});
    this.debugClients[proxyPort] = this.debugClients[proxyPort] || [];
    this.debugClients[proxyPort].push(debugClient);
    debugClient.once("disconnect", () => {
      _.remove(this.debugClients[proxyPort], (c) => c === debugClient);
    });
    // These allow us to use the APIs below
    await debugClient.Runtime.enable();
    await debugClient.Debugger.enable();
    // This starts watching for the initial pause event, which gives us the
    // inside-electron call frame to inject into (i.e. with require() available)
    const callFramePromise = new Promise((resolve) => {
      debugClient.Debugger.paused((stack) => {
        resolve(stack.callFrames[0].callFrameId);
      });
    });
    // This confirms we're ready, and triggers pause():
    await debugClient.Runtime.runIfWaitingForDebugger();
    const callFrameId = await callFramePromise;
    console.log("Injecting interception settings into Electron app...");
    // Inside the Electron process, load our electron-intercepting JS.
    const certData = readFile(this.config.https.certPath, "utf8");
    const injectionResult = await debugClient.Debugger.evaluateOnCallFrame({
      expression: `require(${
        // Need to stringify to handle chars that need escaping (e.g. windows backslashes)
        JSON.stringify(path.join(OVERRIDES_DIR, "js", "prepend-electron.js"))
      })({
                newlineEncodedCertData: "${(await certData).replace(
                  /\r\n|\r|\n/g,
                  "\\n"
                )}",
                spkiFingerprint: "${generateSPKIFingerprint(await certData)}"
            })`,
      callFrameId,
    });
    if (injectionResult.exceptionDetails) {
      const exception = injectionResult.exceptionDetails;
      console.log(exception);
      console.log("Evaluate error", {
        message: exception && exception.description,
        data: injectionResult.exceptionDetails,
      });
      throw new Error("Failed to inject into Electron app", {cause: appLaunchErrorTypes.MISC});
    }
    console.log("App intercepted, resuming...");
    await debugClient.Debugger.resume();
    console.log("App resumed, Electron interception complete");
  }

  async deactivate(proxyPort) {
    if (!this.isActive(proxyPort)) return;
    await Promise.all(
      this.debugClients[proxyPort].map(async (debugClient) => {
        let shutdown = false;
        const disconnectPromise = new Promise((resolve) =>
          debugClient.once("disconnect", resolve)
        ).then(() => {
          shutdown = true;
        });
        const pidResult = (
          await debugClient.Runtime.evaluate({
            expression: "process.pid",
          }).catch((error) => {
            Sentry.captureException(error);
            return { result: undefined };
          })
        ).result;
        const pid =
          pidResult && pidResult.type === "number"
            ? pidResult.value
            : undefined;
        // If we can extract the pid, use it to cleanly close the app:
        if (_.isNumber(pid)) {
          if (process.platform === "win32") {
            await windowsClose(pid);
          } else {
            process.kill(pid, "SIGTERM");
          }
          // Wait up to 1s for a clean shutdown & disconnect
          await Promise.race([disconnectPromise, delay(1000)]);
        }
        if (!shutdown) {
          // Didn't shutdown yet? Inject a hard exit.
          await Promise.race([
            debugClient.Runtime.evaluate({
              expression: "process.exit(0)",
            }).catch((error) => {
              Sentry.captureException(error);
            }),
            disconnectPromise, // If we disconnect, evaluate can time out
          ]);
        }
      })
    );
  }

  async deactivateAll() {
    await Promise.all(
      Object.keys(this.debugClients).map((port) => this.deactivate(port))
    );
  }
}
