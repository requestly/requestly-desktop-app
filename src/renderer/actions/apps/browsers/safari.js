import { SystemWideProxy } from "../os/system-wide";

class SafariInterceptor {
  constructor(config, variantName) {
    this.config = config;
    this.variantName = variantName;
    this.activeBrowsers = {};
  }

  isActive(proxyPort) {
    return false;
  }

  async isActivable() {
    return process.platform === "darwin";
  }

  async activate(proxyPort) {
    return new Error("Not supported");
  }

  async deactivate(proxyPort) {
    return true;
  }

  async deactivateAll() {
    return true;
  }
}

// Hack for now as instance level safari proxy doesn't work
export class FreshSafari extends SystemWideProxy {
  constructor(config) {
    super(config, "safari");
    this.id = "fresh-safari";
    this.version = "1.0.0";
  }
  async isActivable() {
    return process.platform === "darwin";
  }
}

export class ExistingSafari extends SafariInterceptor {
  constructor(config) {
    super(config, "safari");
    this.id = "existing-safari";
    this.version = "1.0.0";
  }
}
