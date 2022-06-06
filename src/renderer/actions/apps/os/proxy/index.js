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
