// import { execSync } from "child_process";
import Adb, { DeviceClient } from "@devicefarmer/adbkit";

// import getProxyConfig from "renderer/actions/proxy/getProxyConfig";
import { hasCertInstalled, rootDevice } from "./adb-commands";
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

  isActive(deviceId) {
    console.log("android-adb:isActive", {
      deviceId,
      activeDevices: JSON.stringify(this.activeDevices),
    });
    const device = this.activeDevices[deviceId];
    return !!device;
  }

  async isActivable() {
    console.log("adb:isActivable", this.id);
    return true;
  }

  async activate(proxyPort, options) {
    if (this.isActive(options?.deviceId)) {
      console.log(`Device ${options?.deviceId} is already active`);
      return;
    }

    // const deviceClient = new DeviceClient(this.adbClient, options.deviceId);

    // 1. Check ADB installed or not
    // 2. If not prompt for install
    // 3. If installed, check for device availability
    // 4. If not, show error message
    // 5. If available, install proxy and certificate

    //     if (this.config?.https?.certPath) {
    //       const caCommand = `#!/bin/bash
    // subjectHash='openssl x509 -inform PEM -subject_hash_old -in '${this.config?.https?.certPath}' | head -n 1'
    // openssl x509 -in '${this.config?.https?.certPath}' -inform PEM -outform DER -out $subjectHash.0
    // adb -s ${options.deviceId} root
    // sleep 5
    // adb -s ${options.deviceId} push ./$subjectHash.0 /data/misc/user/0/cacerts-added/$subjectHash.0
    // adb -s ${options.deviceId} shell "su 0 chmod 644 /data/misc/user/0/cacerts-added/$subjectHash.0"
    // rm ./$subjectHash.0
    // `;
    //       console.log("Installing certificate", caCommand);
    //       execSync(caCommand);
    //     }

    //     console.log("[android-adb:activate] Settings up proxy", { options });
    //     const deviceClient = new DeviceClient(this.adbClient, options.deviceId);
    //     await deviceClient.shell(
    //       `settings put global http_proxy "${getProxyConfig().ip}:${proxyPort}"`
    //     );

    // await deviceClient.reboot();

    try {
      await rootDevice(this.adbClient, options.deviceId);
      await delay(4000);
      const needsReboot = await this.injectSystemCertIfPossible(
        options.deviceId,
        this.config?.https?.certContent
      );
      await this.setupProxy(proxyPort, options.deviceId);
      await delay(2000);

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
      await delay(2000);
      throw err;
    }
  }

  async deactivate(proxyPort, options) {
    console.log("android:deactivate", { proxyPort, options });
    const deviceClient = new DeviceClient(this.adbClient, options.deviceId);

    if (this.isActive(options.deviceId)) {
      await deviceClient.shell("settings put global http_proxy :0");
      delete this.activeDevices[options.deviceId];
    }
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
    const cert = parseCert(certContent);

    try {
      const subjectHash = getCertificateSubjectHash(cert);
      const fingerprint = getCertificateFingerprint(cert);

      console.log({ cert, subjectHash, fingerprint });

      if (
        await hasCertInstalled(
          this.adbClient,
          deviceId,
          subjectHash,
          fingerprint
        )
      ) {
        console.log("Cert already installed, nothing to do");
        return false;
      }

      if (this.config?.https?.certPath) {
        console.log(
          "[android-adb:activate:injectSystemCertIfPossible] Installing certificate"
        );
        const escapedCertPath = this.config?.https?.certPath.replace(
          /(\s+)/g,
          "\\$1"
        );

        // // Root device
        // console.log(
        //   "[android-adb:activate:injectSystemCertIfPossible] Rooting Device"
        // );
        // await rootDevice(this.adbClient, deviceId);
        // console.log(
        //   "[android-adb:activate:injectSystemCertIfPossible] Rooting Device Fin"
        // );

        // Prepare & Push Certificate
        console.log(
          "[android-adb:activate:injectSystemCertIfPossible] Pushing Certificate"
        );
        const caCommand = `#!/bin/bash
subjectHash=\`openssl x509 -inform PEM -subject_hash_old -in ${escapedCertPath} | head -n 1\`
openssl x509 -in ${escapedCertPath} -inform PEM -outform DER -out $subjectHash.0
adb -s ${deviceId} push ./$subjectHash.0 /data/misc/user/0/cacerts-added/$subjectHash.0
adb -s ${deviceId} shell "su 0 chmod 644 /data/misc/user/0/cacerts-added/$subjectHash.0"
`;
        const output = execSync(caCommand).toString();
        console.log(
          "[android-adb:activate:injectSystemCertIfPossible:prepareCertificate] Pushing Certificate Fin",
          { output, caCommand }
        );

        // // Push Certificate
        // console.log(
        //   "[android-adb:activate:injectSystemCertIfPossible] Pushing Ceritificate"
        // );
        // await this.adbClient
        //   .getDevice(deviceId)
        //   .push(
        //     `./$subjectHash.0 /data/misc/user/0/cacerts-added/$subjectHash.0`
        //   );

        // await this.adbClient
        //   .getDevice(deviceId)
        //   .shell(
        //     `su 0 chmod 644 /data/misc/user/0/cacerts-added/$subjectHash.0`
        //   );

        // console.log(
        //   "[android-adb:activate:injectSystemCertIfPossible] Pushing Ceritificate Fin"
        // );
      }
      return true;
    } catch (e) {
      console.error("[android-adb:injectSystemCertIfPossible] Error", e);
    }
    return false;
  }
}
