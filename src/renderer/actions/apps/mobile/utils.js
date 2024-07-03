import { execSync } from "child_process";

const parseDeviceDetails = (detailString) => {
  const details = {};

  if (!detailString) {
    return details;
  }

  detailString.split(" ").forEach((detail) => {
    const [key, value] = detail.split(":");
    details[key] = value;
  });

  return details;
};

export const getAvailableAndroidDevices = () => {
  let devices = [];
  const command = `adb devices -l`;

  const output = execSync(command).toString();
  /*
  const output = `List of devices attached
emulator-5556 device product:sdk_google_phone_x86_64 model:Android_SDK_built_for_x86_64 device:generic_x86_64
0a388e93      unauthorized usb:1-1 product:razor model:Nexus_7 device:flo
0a388e93      device usb:1-1 product:razor model:Nexus_7 device:flo
0a388e93      offline`;
  */

  const pattern =
    /^(?<deviceId>.+?)\s+(?<status>device|unauthorized|offline)(?:\s+(?<details>.+))?$/gm;
  const matches = [...output.matchAll(pattern)];

  if (matches) {
    devices = matches.map((match) => {
      const device = {
        id: match.groups.deviceId,
        status: match.groups?.status,
        details: parseDeviceDetails(match.groups.details),
      };

      return device;
    });
  }

  console.log("Available Android Devices", { output, matches, devices });
  return devices;
};

export const getAvailableIOSDevices = () => {};
