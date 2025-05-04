import { getCurrentProxyPort } from "renderer/actions/storage/cacheUtils";

let applyProxyOsx, removeProxyOsx, applyProxyWindows, removeProxyWindows;

if (process.platform === "darwin") {
  ({ applyProxyOsx, removeProxyOsx } = require("./osx"));
}
else if (process.platform === "win32") {
  ({ applyProxyWindows, removeProxyWindows } = require("./windows"));
}

const applyProxy = (port) => {
  const targetPort = port ? port : getCurrentProxyPort()
  const host = "127.0.0.1";

  switch (process.platform) {
    case "darwin":
      applyProxyOsx(host, targetPort);
      break;
    case "win32":
      applyProxyWindows(host, targetPort);
      break;
    default:
      console.log(`${process.platform} is not supported for systemwide proxy`);
      return false;
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
      console.log(`${process.platform} is not supported for systemwide proxy`);
      return false;
  }
};

export { applyProxy, removeProxy };
