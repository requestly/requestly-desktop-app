import Adb, { DeviceClient } from "@devicefarmer/adbkit";

import {
  checkProxy,
  hasCertInstalled,
  pushFile,
  rootDevice,
  stringAsStream,
} from "./adb-commands";
import {
  getCertificateFingerprint,
  getCertificateSubjectHash,
  parseCert,
} from "renderer/utils/cert";
import getProxyConfig from "renderer/actions/proxy/getProxyConfig";
import { execSync } from "child_process";
import { delay } from "./utils";

export default class AndroidAdbDevice {
  constructor(config) {
    this.adbClient = Adb.createClient();
    this.id = "android-adb";
    this.config = config;
    this.activeDevices = {};

    console.log("AndroidAdbDevice", { config });
  }

  async isActive(deviceId, proxyPort) {
    console.log("android-adb:isActive", {
      deviceId,
      activeDevices: JSON.stringify(this.activeDevices),
    });
    const proxyOutput = await checkProxy(this.adbClient, deviceId);

    console.log("android-adb:isActive", {
      proxyOutput,
      proxy: `${getProxyConfig().ip}:${proxyPort}`,
    });

    const device = this.activeDevices[deviceId];
    if (proxyOutput === `${getProxyConfig().ip}:${proxyPort}` && device) {
      console.log("[android-adb:isActive] Device active");
      return true;
    }

    console.log("[android-adb:isActive] Device not active");
    return false;
  }

  async isActivable() {
    console.log("adb:isActivable", this.id);
    return true;
  }

  async activate(proxyPort, options) {
    if (await this.isActive(options?.deviceId, proxyPort)) {
      console.log(`Device ${options?.deviceId} is already active`);
      return;
    }

    try {
      await rootDevice(this.adbClient, options.deviceId);
      await delay(4000);
      const needsReboot = await this.injectSystemCertIfPossible(
        options.deviceId,
        this.config?.https?.certContent
      );
      await this.setupProxy(proxyPort, options.deviceId);
      await delay(1000);

      if (needsReboot) {
        await this.adbClient.getDevice(options.deviceId).reboot();
      }
      this.activeDevices[options?.deviceId] = true;
      // eslint-disable-next-line consistent-return
      return {
        message: needsReboot
          ? "Restarting device to apply changes. Please wait..."
          : "",
      };
    } catch (err) {
      console.log(err);
      this.removeProxy(options.deviceId);
      await delay(1000);
      throw err;
    }
  }

  async deactivate(proxyPort, options) {
    console.log("android:deactivate", { proxyPort, options });
    const deviceClient = new DeviceClient(this.adbClient, options.deviceId);

    await deviceClient.shell("settings put global http_proxy :0");
    delete this.activeDevices[options.deviceId];
  }

  async deactivateAll() {
    console.log("Deactivate all android devices");
    Object.keys(this.activeDevices).forEach((deviceId) => {
      this.deactivate(null, { deviceId });
    });
  }

  async removeProxy(deviceId) {
    console.log("Removing proxy");
    await this.adbClient
      .getDevice(deviceId)
      .shell("settings put global http_proxy :0");
  }

  async setupProxy(proxyPort, deviceId) {
    try {
      console.log("[android-adb:activate:setupProxy] Setting up proxy", {
        proxyPort,
        deviceId,
      });
      await this.adbClient
        .getDevice(deviceId)
        .shell(
          `settings put global http_proxy "${getProxyConfig().ip}:${proxyPort}"`
        )
        .then(Adb.util.readAll)
        .then((output) =>
          console.log(
            "[android-adb:activate:setupProxy] Proxy setup output",
            output.toString()
          )
        );
    } catch (err) {
      console.error("[android-adb:activate:setupProxy] Error", err);
      throw new Error("Error setting up proxy");
    }
  }

  async injectSystemCertIfPossible(deviceId, certContent) {
    console.log(
      "[android-adb:activate:injectSystemCertIfPossible] Start: Installing Certificate"
    );
    try {
      const cert = parseCert(certContent);
      const subjectHash = getCertificateSubjectHash(cert);
      const fingerprint = getCertificateFingerprint(cert);

      if (
        await hasCertInstalled(
          this.adbClient,
          deviceId,
          subjectHash,
          fingerprint
        )
      ) {
        console.log(
          "[android-adb:activate:injectSystemCertIfPossible] Certificate already installed"
        );
        return false;
      }

      // Push Certificate to file on Device
      console.log(
        "[android-adb:activate:injectSystemCertIfPossible] Pushing Certificate"
      );

      await pushFile(
        this.adbClient,
        deviceId,
        stringAsStream(certContent.replace("\r\n", "\n")),
        `/data/misc/user/0/cacerts-added/${subjectHash}.0`,
        0o444
      );

      const caCommand = `#!/bin/bash
        adb -s ${deviceId} shell "su 0 chmod 644 /data/misc/user/0/cacerts-added/${subjectHash}.0"
        `;
      const output = execSync(caCommand).toString();

      console.log(
        "[android-adb:activate:injectSystemCertIfPossible] Pushing Certificate Fin",
        { output, caCommand }
      );
      return true;
    } catch (e) {
      console.error("[android-adb:injectSystemCertIfPossible] Error", e);
    }
    return false;
  }
}
