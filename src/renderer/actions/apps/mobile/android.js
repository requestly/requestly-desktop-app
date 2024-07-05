// import { execSync } from "child_process";
import Adb, { DeviceClient } from "@devicefarmer/adbkit";

// import getProxyConfig from "renderer/actions/proxy/getProxyConfig";
import {
  ANDROID_TEMP,
  getRootCommand,
  hasCertInstalled,
  injectSystemCertificate,
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
      await this.setupProxy(proxyPort, options.deviceId);
      await this.injectSystemCertIfPossible(
        options.deviceId,
        this.config?.https?.certContent
      );
      await this.adbClient.getDevice(options.deviceId).reboot();
      this.activeDevices[options?.deviceId] = true;
    } catch (err) {
      console.log(err);
      this.removeProxy(options.deviceId);
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
    console.log("[android-adb:activate] Settings up proxy", {
      deviceId,
      command: `settings put global http_proxy "${
        getProxyConfig().ip
      }:${proxyPort}"`,
    });
    await this.adbClient
      .getDevice(deviceId)
      .shell(
        `settings put global http_proxy "${getProxyConfig().ip}:${proxyPort}"`
      )
      .then(Adb.util.readAll)
      .then((output) =>
        console.log(
          "[android-adb:activate] Proxy setup output",
          output.toString()
        )
      );
  }

  async injectSystemCertIfPossible(deviceId, certContent) {
    const rootCmd = await getRootCommand(this.adbClient, deviceId);
    if (!rootCmd) {
      console.log("Root not available, skipping cert injection");
      return;
    }

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
        return;
      }

      const certPath = `${ANDROID_TEMP}/${subjectHash}.0`;
      console.log(`Adding cert file as ${certPath}`);

      // await pushFile(
      //   this.adbClient,
      //   deviceId,
      //   stringAsStream(certContent.replace("\r\n", "\n")),
      //   certPath,
      //   0o444
      // );

      // await injectSystemCertificate(
      //   this.adbClient,
      //   deviceId,
      //   rootCmd,
      //   certPath
      // );

      if (this.config?.https?.certPath) {
        const escapedCertPath = this.config?.https?.certPath.replace(
          /(\s+)/g,
          "\\$1"
        );
        const caCommand = `#!/bin/bash
subjectHash=\`openssl x509 -inform PEM -subject_hash_old -in ${escapedCertPath} | head -n 1\`
openssl x509 -in ${escapedCertPath} -inform PEM -outform DER -out $subjectHash.0
adb root
adb push ./$subjectHash.0 /data/misc/user/0/cacerts-added/$subjectHash.0
adb shell "su 0 chmod 644 /data/misc/user/0/cacerts-added/$subjectHash.0"
`;
        console.log("Installing certificate", caCommand);
        const output = execSync(caCommand).toString();
        console.log("Installing Ceritificate Output", output);
      }

      // await this.adbClient.getDevice(deviceId).reboot();

      console.log(`Cert injected`);
    } catch (e) {
      console.error("[android-adb:injectSystemCertIfPossible] Error", e);
    }
  }
}
