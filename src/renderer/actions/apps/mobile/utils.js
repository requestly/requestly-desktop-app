import Adb from "@devicefarmer/adbkit";

export const getAvailableAndroidDevices = async () => {
  const adbClient = Adb.createClient();
  const devices = await adbClient.listDevicesWithPaths();
  console.log("Available Android Devices", { devices });
  return devices;
};

export const getAvailableIOSDevices = () => {};
