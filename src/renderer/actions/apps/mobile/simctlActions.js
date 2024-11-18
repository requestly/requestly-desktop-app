import { Simctl } from "node-simctl";

const simctl = new Simctl();

function convertDeviceArrayToMap(devices) {
  return devices.reduce((acc, device) => {
    acc[device.udid] = device;
    return acc;
  }, {});
}

export async function getIosSimulators() {
  const devices = await simctl.list();
  const allDevices = Object.values(devices.devices).flat();
  // console.log(allDevices);
  const activeDevices = allDevices.filter(
    (device) => device.state === "Booted"
  );
  const usedDevices = allDevices.filter((device) => device.logPathSize > 0);

  return {
    allDevices: convertDeviceArrayToMap(allDevices),
    activeDevices,
    usedDevices,
  };
}
