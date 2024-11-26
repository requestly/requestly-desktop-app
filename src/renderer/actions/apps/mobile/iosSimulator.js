/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
import { SystemWideProxy } from "../os/system-wide";
import { Simctl } from "node-simctl";

export default class IosSimulatorDevice extends SystemWideProxy {
  static runningSimulators = {};

  static potentialSimulators = {};

  static simctl = new Simctl();

  static simulatorsBeingIntercepted = {};

  constructor(config) {
    super(config);
    this.id = "ios-simulator";
    this.config = config;
    console.log("IosSimulator", { config });
    this.simctl = new Simctl();
  }

  async isActive() {
    if (Object.keys(IosSimulatorDevice.simulatorsBeingIntercepted).length)
      return true;
    return false;
  }

  async isActivable() {
    if (process.platform !== "darwin") return false;
    return true;
  }

  async activate(proxyPort, options) {
    const deviceIds = // if no deviceIds provided, activate all running simulators
      options?.deviceIds ||
      Object.keys(IosSimulatorDevice.runningSimulators).map((simId) => simId);

    deviceIds.forEach(async (deviceId) => {
      try {
        // sanity check
        await this.launchDevice(deviceId);
      } catch (e) {
        console.log(
          "Error occured while launching device. If because device was already running, ignore"
        );
        console.log(e);
      }
      await this.trustRootCAForDevice(deviceId).catch(console.error);
      IosSimulatorDevice.simulatorsBeingIntercepted[deviceId] = true;
    });

    super.activate(proxyPort);
  }

  async deactivate(proxyPort, options) {
    const deviceIds = // if no deviceIds provided, activate all running simulators
      options?.deviceIds ||
      Object.keys(IosSimulatorDevice.simulatorsBeingIntercepted).map(
        (simId) => simId
      );

    deviceIds.forEach(async (deviceId) => {
      console.log("DBG: Deactivating", deviceId);
      delete IosSimulatorDevice.simulatorsBeingIntercepted[deviceId];
    });
    return super.deactivate();
  }

  async trustRootCAForDevice(udid) {
    IosSimulatorDevice.simctl._udid = udid;
    return IosSimulatorDevice.simctl.addRootCertificate(
      this.config.https.certPath
    );
  }

  async launchDevice(udid) {
    this.simctl._udid = udid;
    return this.simctl.bootDevice();
  }

  static async getAvailableSimulators() {
    const devices = await this.simctl.list();
    const allDevices = Object.values(devices.devices).flat();
    const activeDevices = allDevices.filter(
      (device) => device.state === "Booted"
    );
    const usedDevices = allDevices.filter((device) => device.logPathSize > 0);

    const result = {
      allDevices: this.convertDeviceArrayToMap(allDevices),
      activeDevices: this.convertDeviceArrayToMap(activeDevices),
      usedDevices: this.convertDeviceArrayToMap(usedDevices),
    };

    IosSimulatorDevice.runningSimulators = result.activeDevices;
    IosSimulatorDevice.potentialSimulators = result.allDevices;
    return result;
  }

  static convertDeviceArrayToMap(devices) {
    return devices.reduce((acc, device) => {
      acc[device.udid] = device;
      return acc;
    }, {});
  }
}
