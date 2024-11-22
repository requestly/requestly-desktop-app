/* eslint-disable no-underscore-dangle */
import { SystemWideProxy } from "../os/system-wide";
import { Simctl } from "node-simctl";

export default class IosSimulatorDevice extends SystemWideProxy {
  constructor(config) {
    super(config); // tobe checked
    this.id = "ios-simulator";
    this.config = config;
    this.potentialSimulators = [];
    this.runningSimulators = []; // todo: be updated by ipc
    this.simulatorsBeingIntercepted = {};
    console.log("IosSimulator", { config });
    this.simctl = new Simctl();
  }

  async isActive() {
    if (Object.keys(this.simulatorsBeingIntercepted).length) return true;
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  async isActivable() {
    if (process.platform !== "darwin") return false;
    // if (!this.runningSimulators.length) return false; // tobe checked
    return true;
  }

  async activate(proxyPort, options) {
    const deviceIds = // if no deviceIds provided, activate all running simulators
      options?.deviceIds || this.runningSimulators.map((sim) => sim.udid);

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
      await this.trustRootCAForDevice(deviceId);
      this.simulatorsBeingIntercepted[deviceId] = true;
    });

    super.activate(proxyPort);
  }

  async deactivate(proxyPort, options) {
    const deviceIds = // if no deviceIds provided, activate all running simulators
      options?.deviceIds || this.runningSimulators.map((sim) => sim.udid);

    deviceIds.forEach(async (deviceId) => {
      console.log("DBG: Deactivating", deviceId);
      delete this.simulatorsBeingIntercepted[deviceId];
    });
    return super.deactivate();
  }

  async trustRootCAForDevice(udid) {
    this.simctl._udid = udid;
    return this.simctl.addRootCertificate(this.config.https.certPath);
  }

  async launchDevice(udid) {
    this.simctl._udid = udid;
    return this.simctl.bootDevice();
  }
}
