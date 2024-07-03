import { execSync } from "child_process";
import getProxyConfig from "renderer/actions/proxy/getProxyConfig";

export default class AndroidDevice {
  constructor(config) {
    this.id = "android";
    this.config = config;
    // this.deviceId = deviceId;
    this.activeDevices = {};
  }

  isActive(deviceId) {
    console.log("isActive", {
      deviceId,
      activeDevices: JSON.stringify(this.activeDevices),
    });
    const device = this.activeDevices[deviceId];
    return !!device;
  }

  async isActivable() {
    console.log(this.config);
    return true;
  }

  async activate(proxyPort, options) {
    if (this.isActive(options?.deviceId)) return;

    console.log(this.config);
    // 1. Check ADB installed or not
    // 2. If not prompt for install
    // 3. If installed, check for device availability
    // 4. If not, show error message
    // 5. If available, install proxy and certificate
    const proxyCommand = `adb -s ${
      options?.deviceId
    } shell settings put global http_proxy "${
      getProxyConfig().ip
    }:${proxyPort}"`;
    console.log("Setting proxy", proxyCommand);
    execSync(proxyCommand);

    if (this.config?.https?.certPath) {
      const caCommand = `PEM_FILE_NAME=${this.config?.https?.certPath}
hash=$(openssl x509 -inform PEM -subject_hash_old -in $PEM_FILE_NAME | head -1)
OUT_FILE_NAME="$hash.0"

cp $PEM_FILE_NAME $OUT_FILE_NAME
openssl x509 -inform PEM -text -in $PEM_FILE_NAME -out /dev/null >> $OUT_FILE_NAME

echo "Saved to $OUT_FILE_NAME"
adb -s ${options?.deviceId} shell mount -o rw,remount,rw /system
adb -s ${options?.deviceId} push $OUT_FILE_NAME /system/etc/security/cacerts/
adb -s ${options?.deviceId} shell mount -o ro,remount,ro /system
adb -s ${options?.deviceId} reboot`;
      console.log("Installing certificate", caCommand);
      execSync(caCommand);
    }

    this.activeDevices[options?.deviceId] = true;
  }

  async deactivate(proxyPort, options) {
    console.log("Deactivate android", { proxyPort, options });
    if (this.isActive(options.deviceId)) {
      const proxyCommand = `adb -s ${options?.deviceId} shell settings put global http_proxy :0`;
      console.log("Removing proxy", proxyCommand);
      execSync(proxyCommand);
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
