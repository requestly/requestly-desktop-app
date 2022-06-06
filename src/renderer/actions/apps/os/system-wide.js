import * as _ from "lodash";
import { installCert } from "./ca";

import { applyProxy, removeProxy } from "./proxy";

export class SystemWideProxy {
  constructor(config) {
    this.config = config;
    this.id = "system-wide";
    this.version = "1.0.0";
    this.is_active = false;
  }

  async isActive() {
    return this.is_active;
  }

  async isActivable() {
    if (process.platform === "darwin" || process.platform === "win32") {
      return true;
    }

    return false;
  }

  async activate(proxyPort) {
    const cert_status = await installCert(this.config.https.certPath);
    if (!cert_status) {
      throw new Error(`Certificate not installed`);
    }

    applyProxy(proxyPort);
    this.is_active = true;
  }

  async deactivate() {
    removeProxy();
    this.is_active = false;
  }

  async deactivateAll() {
    this.deactivate();
  }
}
