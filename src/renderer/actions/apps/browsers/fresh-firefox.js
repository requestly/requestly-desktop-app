import * as _ from "lodash";
import * as path from "path";
/** CONFIG */
import { staticConfig } from "../../../config";
/** BROWSERS HANDLER */
import { getAvailableBrowsers, launchBrowser } from "./browser-handler";
/** UTILS */
import { delay } from "../../../utils/misc";
/** ACTIONS */
import { readFile, canAccess, deleteFolder } from "../../fileManagement";
import { windowsKill, spawnToResult } from "../../processManagement";
// SENTRY
import * as Sentry from "@sentry/browser";
import { ipcRenderer } from "electron";
import { appLaunchErrorTypes } from "renderer/lib/errors";
const FIREFOX_PREF_REGEX = /\w+_pref\("([^"]+)", (.*)\);/;
let profileSetupBrowser;
let browsers = {};

export const NSS_DIR = path.join(staticConfig.STATIC_FILES_DIR, "nss");

const testCertutil = (command, options) => {
  return spawnToResult(command, ["-h"], options)
    .then(
      (output) =>
        output.exitCode === 1 &&
        output.stderr.includes(
          "Utility to manipulate NSS certificate databases"
        )
    )
    .catch((e) => {
      Sentry.captureException(e);
      if (e.code !== "ENOENT") {
        console.log(`Failed to run ${command}`);
        console.log(e);
      }
      return false;
    });
};

const getCertutilCommand = _.memoize(async () => {
  // If a working certutil is available in our path, we're all good
  if (await testCertutil("certutil")) return { command: "certutil" };
  // If not, try to use the relevant bundled version
  const bundledCertUtil = path.join(NSS_DIR, process.platform, "certutil");
  if (process.platform !== "linux") {
    if (await testCertutil(bundledCertUtil)) {
      return { command: bundledCertUtil };
    } else {
      throw new Error(
        "No certutil available",
        {cause: appLaunchErrorTypes.CERTUTIL_NOT_FOUND}
      );
    }
  }

  const certutilEnv = Object.assign(Object.assign({}, process.env), {
    // The linux bundle includes most required libs, but we need to make sure it's
    // in the search path so they get used, in case they're not installed elsewhere.
    LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH
      ? `${path.join(NSS_DIR, process.platform)}:${process.env.LD_LIBRARY_PATH}`
      : path.join(NSS_DIR, process.platform),
  });

  if (await testCertutil(bundledCertUtil, { env: certutilEnv })) {
    return { command: bundledCertUtil, options: { env: certutilEnv } };
  } else {
    throw new Error(
      "No certutil available",
      {cause: appLaunchErrorTypes.CERTUTIL_NOT_FOUND}
    );
  }
});

export class FreshFirefox {
  constructor(config) {
    this.config = config;
    this.id = "fresh-firefox";
    this.version = "1.1.0";
    this.firefoxProfilePath = path.join(
      this.config.configPath,
      "firefox-profile"
    );
  }

  isActive(proxyPort) {
    return browsers[proxyPort] != null && !!browsers[proxyPort].pid;
  }

  async isActivable() {
    const availableBrowsers = await getAvailableBrowsers(
      this.config.configPath
    );
    const firefoxBrowser = _.find(availableBrowsers, { name: "firefox" });
    return (
      !!firefoxBrowser && // Must have Firefox installed
      // parseInt(firefoxBrowser.version.split(".")[0], 0) >= 58 && // Must use cert9.db // No longer concerned
      (await getCertutilCommand()
        .then(() => true)
        .catch((err) => {
          console.log(err);
          Sentry.captureException(err);
          return false;
        }))
    ); // Must have certutil available
  }

  async startFirefox(initialServer, proxyPort, existingPrefs = {}) {
    const initialUrl = initialServer.url;
    const browser = await launchBrowser(
      initialUrl,
      {
        browser: "firefox",
        profile: this.firefoxProfilePath,
        proxy: proxyPort
          ? `${staticConfig.PROXY_HOST}:${proxyPort}`
          : undefined,
        prefs: _.assign(
          existingPrefs,
          proxyPort
            ? {
                // By default browser-launcher only configures HTTP, so we need to add HTTPS:
                "network.proxy.ssl": `"${staticConfig.PROXY_HOST}"`,
                "network.proxy.ssl_port": proxyPort,
                // The above browser-launcher proxy settings should do this, but don't seem to
                // reliably overwrite existing values, so we set them explicitly.
                "network.proxy.http": `"${staticConfig.PROXY_HOST}"`,
                "network.proxy.http_port": proxyPort,
                // Don't intercept our cert testing requests
                "network.proxy.no_proxies_on": '"' + initialServer.host + '"',
                "network.proxy.http.no_proxies_on":
                  '"' + initialServer.host + '"',
                // Send localhost reqs via the proxy too
                "network.proxy.allow_hijacking_localhost": true,
              }
            : {},
          {
            // Disable the noisy captive portal check requests
            "network.captive-portal-service.enabled": false,
            // Disable some annoying tip messages
            "browser.chrome.toolbar_tips": false,
            // Ignore available updates:
            "app.update.auto": false,
            "browser.startup.homepage_override.mstone": '"ignore"',
            // Disable exit warnings:
            "browser.showQuitWarning": false,
            "browser.tabs.warnOnClose": false,
            "browser.tabs.warnOnCloseOtherTabs": false,
            // Disable various first-run things:
            "browser.uitour.enabled": false,
            "browser.usedOnWindows10": true,
            "browser.usedOnWindows10.introURL": '""',
            "datareporting.healthreport.service.firstRun": false,
            "toolkit.telemetry.reportingpolicy.firstRun": false,
            "browser.reader.detectedFirstArticle": false,
            "datareporting.policy.dataSubmissionEnabled": false,
            "datareporting.policy.dataSubmissionPolicyAccepted": false,
            "datareporting.policy.dataSubmissionPolicyBypassNotification": true,
            "trailhead.firstrun.didSeeAboutWelcome": true,
            // Refresh all state on shutdown:
            "privacy.history.custom": true,
            "privacy.sanitize.sanitizeOnShutdown": true,
            "privacy.clearOnShutdown.cache": true,
            "privacy.clearOnShutdown.cookies": true,
            "privacy.clearOnShutdown.downloads": true,
            "privacy.clearOnShutdown.formdata": true,
            "privacy.clearOnShutdown.history": true,
            "privacy.clearOnShutdown.offlineApps": true,
            "privacy.clearOnShutdown.sessions": true,
            "privacy.clearOnShutdown.siteSettings": true,
            // Must be false, or 1st startup 2nd start opens a blank page, not the target URL:
            "privacy.clearOnShutdown.openWindows": false,
          }
        ),
      },
      this.config.configPath
    );
    console.log("Firefox started");
    if (browser.process.stdout) browser.process.stdout.pipe(process.stdout);
    if (browser.process.stderr) browser.process.stderr.pipe(process.stderr);
    const normalStop = browser.stop.bind(browser);
    browser.stop = async function () {
      if (process.platform === "win32") {
        // Firefox spawns a child process on Windows, and doesn't let us kill it at all.
        // To fix this, we kill all firefox instances that were started with this exact same URL.
        await windowsKill(
          `CommandLine Like '%\\\\firefox.exe%${initialUrl}'`
        ).catch((error) => {
          Sentry.captureException(error);
          console.log(error);
        });
      } else {
        normalStop();
      }
    };
    return browser;
  }

  // Create the profile. We need to run FF to do its setup, then close it & edit more ourselves.
  async setupFirefoxProfile() {
    /** TODO @sagar - Show this message to user on frontend */
    console.log("Requestly is preparing a Firefox profile, please wait...");
    let messageShown = true;
    profileSetupBrowser = await this.startFirefox({
      url: staticConfig.PROXY_TEST_PAGE_URL,
      host: staticConfig.PROXY_HOST,
    });
    profileSetupBrowser.process.once("close", (exitCode) => {
      console.log("Profile setup Firefox closed");
      profileSetupBrowser = undefined;
      if (messageShown !== true) {
        console.error(`Firefox profile setup failed with code ${exitCode}`);
        deleteFolder(this.firefoxProfilePath).catch((error) => {
          Sentry.captureException(error);
          console.warn(error);
        });
      }
    });
    await messageShown;
    messageShown = true;
    await delay(200); // Tiny delay, so firefox can do initial setup tasks
    // Tell firefox to shutdown, and wait until it does.
    profileSetupBrowser.stop();
    await new Promise((resolve) => {
      if (!profileSetupBrowser) return resolve();
      else profileSetupBrowser.process.once("close", resolve);
    });
    // Once firefox has shut, rewrite the certificate database of the newly created profile:
    const certutil = await getCertutilCommand();
    const certUtilResult = await spawnToResult(
      certutil.command,
      [
        "-A",
        "-d",
        `sql:${this.firefoxProfilePath}`,
        "-t",
        "C,,",
        "-i",
        this.config.https.certPath,
        "-n",
        staticConfig.CERT_NAME,
      ],
      certutil.options || {}
    );
    if (certUtilResult.exitCode !== 0) {
      console.log(certUtilResult.stdout);
      console.log(certUtilResult.stderr);
      throw new Error(
        `Certutil firefox profile setup failed with code ${certUtilResult.exitCode}`
      );
    }
  }

  async activate(proxyPort) {
    if (this.isActive(proxyPort) || !!profileSetupBrowser) return;
    const firefoxPrefsFile = path.join(this.firefoxProfilePath, "prefs.js");
    let existingPrefs = {};

    if ((await canAccess(firefoxPrefsFile)) === false) {
      /*
            First time, we do a separate pre-usage startup & stop, without the proxy, for certificate setup.
            This helps avoid initial Firefox profile setup request noise, and tidies up some awkward UX where
            firefox likes to open extra welcome windows/tabs on first run.
            */
      await this.setupFirefoxProfile();
    }

    // We need to preserve & reuse any existing preferences, to avoid issues
    // where on pref setup firefox behaves badly (opening a 2nd window) on OSX.
    const prefContents = await readFile(firefoxPrefsFile, {
      encoding: "utf8",
    }).catch((error) => {
      Sentry.captureException(error);
      return "";
    });
    existingPrefs = prefContents.split("\n").reduce((prefs, line) => {
      const match = FIREFOX_PREF_REGEX.exec(line);
      if (match) {
        prefs[match[1]] = match[2];
      }
      return prefs;
    }, {});
    const browser = await this.startFirefox(
      {
        url: staticConfig.PROXY_TEST_PAGE_URL,
        host: staticConfig.PROXY_HOST,
      },
      proxyPort,
      existingPrefs
    );

    // TODO @sagar - Implement a method here to check if HTTPS is working or not
    let certCheckSuccessful = true;

    browsers[proxyPort] = browser;
    browser.process.once("close", async (exitCode) => {
      console.log("Firefox closed");
      // sending message to UI
      ipcRenderer.invoke("browser-closed", { appId: this.id });
      delete browsers[proxyPort];
      // It seems maybe this can happen when firefox is just updated - it starts and
      // closes immediately, but loses some settings along the way. In that case, the 2nd
      // run will still try to load the cert check server. Keep it up for a sec so
      // that users get a clean error in this case.
      await delay(2000);
      if (!certCheckSuccessful) {
        console.error(
          `Firefox certificate check ${
            certCheckSuccessful === false ? "failed" : "did not complete"
          } with FF exit code ${exitCode}`
        );

        deleteFolder(this.firefoxProfilePath).catch((error) => {
          Sentry.captureException(error);
          console.warn(error);
        });
      }
    });
  }

  async deactivate(proxyPort) {
    if (this.isActive(proxyPort)) {
      const browser = browsers[proxyPort];
      const closePromise = new Promise((resolve) =>
        browser.process.once("close", resolve)
      );
      browser.stop();
      await closePromise;
    }
  }

  async deactivateAll() {
    await Promise.all(
      Object.keys(browsers).map((proxyPort) => this.deactivate(proxyPort))
    );
    if (profileSetupBrowser) {
      profileSetupBrowser.stop();
      return new Promise((resolve) =>
        profileSetupBrowser.process.once("close", resolve)
      );
    }
  }
}
