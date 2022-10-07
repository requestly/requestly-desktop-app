import { appLaunchErrorTypes } from "renderer/lib/errors";

const { applyProxyOsx, removeProxyOsx } = require("./osx");
const { applyProxyWindows, removeProxyWindows } = require("./windows");

const applyProxy = (port) => {
  const host = "127.0.0.1";

  switch (process.platform) {
    case "darwin":
      applyProxyOsx(host, port);
      break;
    case "win32":
      applyProxyWindows(host, port);
      break;
    default:
      throw new Error(
        `${process.platform} is not supported for systemwide proxy`,
        {cause: appLaunchErrorTypes.SYSTEM_WIDE_PROXY_NOT_SUPPORTED}
      )
  }
};

const removeProxy = () => {
  switch (process.platform) {
    case "darwin":
      removeProxyOsx();
      break;
    case "win32":
      removeProxyWindows();
      break;
    default:
      throw new Error(
        `${process.platform} is not supported for systemwide proxy`,
        {cause: appLaunchErrorTypes.SYSTEM_WIDE_PROXY_NOT_SUPPORTED}
      )
  }
};

export { applyProxy, removeProxy };
