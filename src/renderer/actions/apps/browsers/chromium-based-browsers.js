import * as _ from "lodash";
// UTILS
import generateSPKIFingerprint from "../../../utils/cert/generateSPKIFingerprint";
import { delay } from "../../../utils/misc";
// ACTIONS
import { getAvailableBrowsers, launchBrowser } from "./browser-handler";
import { readFile, deleteFolder } from "../../fileManagement";
import {
  listRunningProcesses,
  windowsClose,
  waitForExit,
} from "../../processManagement";
// import { HideWarningServer } from "./close-warning-tab";
// CONFIG
import { staticConfig } from "../../../config";
// SENTRY
import * as Sentry from "@sentry/browser";
import { ipcRenderer } from "electron";
const getBrowserDetails = async (config, variant) => {
  const browsers = await getAvailableBrowsers(config.configPath);
  // Get the details for the first of these browsers that is installed.
  return _.find(browsers, (b) => b.name === variant);
};

const getChromiumLaunchOptions = async (
  browser,
  config,
  proxyPort
  // hideWarningServer
) => {
  const certificatePem = await readFile(config.https.certPath, "utf8");
  const spkiFingerprint = generateSPKIFingerprint(certificatePem);

  return {
    browser,
    proxy: `http://${staticConfig.PROXY_HOST}:${proxyPort}`,
    noProxy: [
      // Force even localhost requests to go through the proxy
      // See https://bugs.chromium.org/p/chromium/issues/detail?id=899126#c17
      "<-loopback>",
      // Don't intercept our warning hiding requests. Note that this must be
      // the 2nd rule here, or <-loopback> would override it.
      // hideWarningServer.host,
    ],
    options: [
      // Trust our CA certificate's fingerprint:
      `--ignore-certificate-errors-spki-list=${spkiFingerprint}`,
      // Avoid annoying extra network noise:
      "--disable-background-networking",
      // Avoid error - You are using an unsupported command-line flag
      "--test-type",
      // ToDo @sagar - Temp fix - Allow all ssl
      "--ignore-certificate-errors",
      "--ignore-urlfetcher-cert-requests",
      // Disable cache
      "--aggressive-cache-discard",
      "--enable-aggressive-domstorage-flushing",
      "--disable-application-cache",
      "--media-cache-size=1",
      "--disk-cache-size=1",
    ],
  };
};

class FreshChromiumBasedInterceptor {
  constructor(config, variantName) {
    this.config = config;
    this.variantName = variantName;
    this.activeBrowsers = {};
  }

  isActive(proxyPort) {
    const browser = this.activeBrowsers[proxyPort];
    return !!browser && !!browser.pid;
  }

  async isActivable() {
    const browserDetails = await getBrowserDetails(
      this.config,
      this.variantName
    );
    return !!browserDetails;
  }

  async activate(proxyPort) {
    if (this.isActive(proxyPort)) return;

    // const hideWarningServer = new HideWarningServer(this.config);
    // await hideWarningServer.start("http://amiusing.requestly.io");

    const browserDetails = await getBrowserDetails(
      this.config,
      this.variantName
    );

    const browser = await launchBrowser(
      // hideWarningServer.hideWarningUrl,
      "http://amiusing.requestly.io",
      await getChromiumLaunchOptions(
        browserDetails ? browserDetails.name : this.variantName,
        this.config,
        proxyPort
        // hideWarningServer
      ),
      this.config.configPath
    );

    if (browser.process.stdout) browser.process.stdout.pipe(process.stdout);
    if (browser.process.stderr) browser.process.stderr.pipe(process.stderr);

    // await hideWarningServer.completedPromise;
    // await hideWarningServer.stop();

    this.activeBrowsers[proxyPort] = browser;

    browser.process.once("close", async () => {
      // sending message to UI
      ipcRenderer.invoke("browser-closed", { appId: this.id });

      delete this.activeBrowsers[proxyPort];
      // Opera has a launch proc that exits immediately in Windows, so we can't clear the profile there.
      if (process.platform === "win32" && this.variantName === "opera") return;
      await delay(1000); // No hurry, make sure the browser & related processes have all cleaned up
      if (
        Object.keys(this.activeBrowsers).length === 0 &&
        browserDetails &&
        _.isString(browserDetails.profile)
      ) {
        // If we were the last browser, and we have a profile path, and it's in our config
        // (just in case something's gone wrong) -> delete the profile to reset everything.
        const profilePath = browserDetails.profile;
        if (!profilePath.startsWith(this.config.configPath)) {
          console.log(
            `Unexpected ${this.variantName} profile location, not deleting: ${profilePath}`
          );
        } else {
          const profileFolder = browserDetails.profile;
          deleteFolder(profileFolder)
            .catch(async () => {
              // After 1 error, wait a little and retry
              await delay(1000);
              await deleteFolder(profileFolder);
            })
            .catch((err) => {
              Sentry.captureException(err);
              console.warn(err);
            }); // If it still fails, just give up, not a big deal
        }
      }
    });
    // Delay the approx amount of time it normally takes the browser to really open, just to be sure
    await delay(500);
  }

  async deactivate(proxyPort) {
    if (this.isActive(proxyPort)) {
      const browser = this.activeBrowsers[proxyPort];
      const exitPromise = new Promise((resolve) =>
        browser.process.once("close", resolve)
      );
      browser.stop();
      await exitPromise;
    }
  }

  async deactivateAll() {
    await Promise.all(
      Object.keys(this.activeBrowsers).map((proxyPort) =>
        this.deactivate(proxyPort)
      )
    );
  }
}

class ExistingChromiumBasedInterceptor {
  constructor(config, variantName) {
    this.config = config;
    this.variantName = variantName;
  }

  async browserDetails() {
    return getBrowserDetails(this.config, this.variantName);
  }

  isActive(proxyPort) {
    const activeBrowser = this.activeBrowser;
    return (
      !!activeBrowser &&
      activeBrowser.proxyPort === proxyPort &&
      !!activeBrowser.browser.pid
    );
  }

  async isActivable() {
    if (this.activeBrowser) return false;
    return !!(await this.browserDetails());
  }

  async findExistingPid() {
    const processes = await listRunningProcesses();
    const browserDetails = await this.browserDetails();
    if (!browserDetails) {
      throw new Error(
        "Can't intercept existing browser without browser details"
      );
    }
    const browserProcesses = processes.filter((proc) => {
      if (process.platform === "darwin") {
        if (!proc.command.startsWith(browserDetails.command)) return false;
        const appBundlePath = proc.command.substring(
          browserDetails.command.length
        );
        // Only *.app/Contents/MacOS/* is the main app process:
        return appBundlePath.match(/^\/Contents\/MacOS\//);
      } else {
        return (
          proc.bin &&
          // Find a binary that exactly matches the specific command:
          (proc.bin === browserDetails.command ||
            // Or whose binary who's matches the path for this specific variant:
            proc.bin.includes(`${browserDetails.name}/${browserDetails.type}`))
        );
      }
    });
    const defaultRootProcess = browserProcesses.find(
      ({ args }) =>
        args !== undefined &&
        // Find the main process, skipping any renderer/util processes
        !args.includes("--type=") &&
        // Also skip any non-default profile processes (e.g. our own fresh Chromes)
        !args.includes("--user-data-dir")
    );
    return defaultRootProcess && defaultRootProcess.pid;
  }

  async activate(proxyPort, options = { closeConfirmed: false }) {
    if (!this.isActivable()) return;
    // const hideWarningServer = new HideWarningServer(this.config);
    // await hideWarningServer.start("http://amiusing.requestly.io");
    const existingPid = await this.findExistingPid();
    if (existingPid) {
      if (!options.closeConfirmed) {
        // Fail, with metadata requesting the UI to confirm that Chrome should be killed
        throw Object.assign(
          new Error(`Not killing ${this.variantName}: not confirmed`),
          { metadata: { closeConfirmRequired: true }, reportable: false }
        );
      }
      if (process.platform === "win32") {
        windowsClose(existingPid);
        try {
          await waitForExit(existingPid);
        } catch (e) {
          Sentry.captureException(e);
          // Try again, but less gently this time:
          process.kill(existingPid);
          await waitForExit(existingPid);
        }
      } else {
        process.kill(existingPid);
        await waitForExit(existingPid);
      }
    }
    const browserDetails = await getBrowserDetails(
      this.config,
      this.variantName
    );
    const launchOptions = await getChromiumLaunchOptions(
      browserDetails ? browserDetails.name : this.variantName,
      this.config,
      proxyPort
      // hideWarningServer
    );
    // Remove almost all default arguments. Each of these changes behaviour in maybe unexpected
    // ways, notably including --disable-restore which actively causes problems.
    launchOptions.skipDefaults = true;
    launchOptions.options.push(
      "--no-default-browser-check",
      "--no-first-run",
      "--disable-popup-blocking", // Required for hide-warning -> amiusing hop
      // If we killed something, use --restore-last-session to ensure it comes back:
      ...(existingPid ? ["--restore-last-session"] : []),
      // Passing the URL here instead of passing it to launchBrowser ensures that it isn't
      // opened in a separate window when launching on Mac
      // hideWarningServer.hideWarningUrl
      "http://amiusing.requestly.io"
    );

    const browser = await launchBrowser(
      "",
      Object.assign(Object.assign({}, launchOptions), {
        skipDefaults: true,
        profile: null, // Enforce that we use the default profile
      }),
      this.config.configPath
    );

    if (browser.process.stdout) browser.process.stdout.pipe(process.stdout);
    if (browser.process.stderr) browser.process.stderr.pipe(process.stderr);

    // await hideWarningServer.completedPromise;
    // await hideWarningServer.stop();

    this.activeBrowser = { browser, proxyPort };
    browser.process.once("close", async () => {
      // sending message to UI
      ipcRenderer.invoke("browser-closed", { appId: this.id });
      delete this.activeBrowser;
    });

    // Delay the approx amount of time it normally takes the browser to really open, just to be sure
    await delay(500);
  }

  async deactivate(proxyPort) {
    if (this.isActive(proxyPort)) {
      const { browser } = this.activeBrowser;
      if (process.platform === "win32") {
        // Try to cleanly close if we can, rather than killing Chrome directly:
        try {
          await windowsClose(browser.pid).then(() => waitForExit(browser.pid));
          return;
        } catch (e) {
          Sentry.captureException(e);
        } // If this fails/times out, kill like we do elsewhere:
      }
      const exitPromise = new Promise((resolve) =>
        browser.process.once("close", resolve)
      );
      browser.stop();
      await exitPromise;
    }
  }

  async deactivateAll() {
    if (this.activeBrowser) {
      await this.deactivate(this.activeBrowser.proxyPort);
    }
  }
}

export class FreshChrome extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "chrome");
    this.id = "fresh-chrome";
    this.version = "1.0.0";
  }
}

export class ExistingChrome extends ExistingChromiumBasedInterceptor {
  constructor(config) {
    super(config, "chrome");
    this.id = "existing-chrome";
    this.version = "1.0.0";
  }
}

export class FreshChromeBeta extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "chrome-beta");
    this.id = "fresh-chrome-beta";
    this.version = "1.0.0";
  }
}

export class FreshChromeDev extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "chrome-dev");
    this.id = "fresh-chrome-dev";
    this.version = "1.0.0";
  }
}

export class FreshChromeCanary extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "chrome-canary");
    this.id = "fresh-chrome-canary";
    this.version = "1.0.0";
  }
}

export class FreshChromium extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "chromium");
    this.id = "fresh-chromium";
    this.version = "1.0.0";
  }
}

export class FreshChromiumDev extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "chromium-dev");
    this.id = "fresh-chromium-dev";
    this.version = "1.0.0";
  }
}

export class FreshEdge extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "msedge");
    this.id = "fresh-edge";
    this.version = "1.0.0";
  }
}

export class FreshEdgeBeta extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "msedge-beta");
    this.id = "fresh-edge-beta";
    this.version = "1.0.0";
  }
}
export class FreshEdgeDev extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "msedge-dev");
    this.id = "fresh-edge-dev";
    this.version = "1.0.0";
  }
}

export class FreshEdgeCanary extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "msedge-canary");
    this.id = "fresh-edge-canary";
    this.version = "1.0.0";
  }
}

export class FreshBrave extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "brave");
    this.id = "fresh-brave";
    this.version = "1.0.0";
  }
}

export class FreshOpera extends FreshChromiumBasedInterceptor {
  constructor(config) {
    super(config, "opera");
    this.id = "fresh-opera";
    this.version = "1.0.3";
  }
}
