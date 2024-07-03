import { execSync } from "child_process";
import Adb, { DeviceClient } from "@devicefarmer/adbkit";

import getProxyConfig from "renderer/actions/proxy/getProxyConfig";

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

    if (this.config?.https?.certPath) {
      const caCommand = `#!/bin/bash
subjectHash='openssl x509 -inform PEM -subject_hash_old -in '${this.config?.https?.certPath}' | head -n 1'
openssl x509 -in '${this.config?.https?.certPath}' -inform PEM -outform DER -out $subjectHash.0
adb -s ${options.deviceId} root
sleep 5
adb -s ${options.deviceId} push ./$subjectHash.0 /data/misc/user/0/cacerts-added/$subjectHash.0
adb -s ${options.deviceId} shell "su 0 chmod 644 /data/misc/user/0/cacerts-added/$subjectHash.0"
rm ./$subjectHash.0
`;
      console.log("Installing certificate", caCommand);
      execSync(caCommand);
    }

    console.log("[android-adb:activate] Settings up proxy", { options });
    const deviceClient = new DeviceClient(this.adbClient, options.deviceId);
    await deviceClient.shell(
      `settings put global http_proxy "${getProxyConfig().ip}:${proxyPort}"`
    );

    // await deviceClient.reboot();

    this.activeDevices[options?.deviceId] = true;
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
}
