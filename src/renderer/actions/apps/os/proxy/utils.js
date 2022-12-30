import UserPreferenceFetcher from "renderer/lib/proxy-interface/userPreferenceFetcher";
import { isWindowsProxyRunning } from "./windows";
const { exec, execSync } = require("child_process");

const isProxyRunning = (proxy_output_str, port) => {
  return (
    proxy_output_str.includes("Enabled: Yes") &&
    proxy_output_str.includes(`Port: ${port}`)
  );
};

const isHttpProxyRunning = (port) => {
  try {
    const http_proxy_output = execSync(`networksetup -getwebproxy Wi-Fi`);
    return isProxyRunning(http_proxy_output, port);
  } catch (err) {
    console.error(err);
    console.log("Error while getwebproxy");
  }
  return false;
};

const isHttpsProxyRunning = (port) => {
  try {
    const https_proxy_output = execSync(
      `networksetup -getsecurewebproxy Wi-Fi`
    );
    return isProxyRunning(https_proxy_output, port);
  } catch (err) {
    console.error(err);
    console.log("Error while getsecurewebproxy");
  }
  return false;
};

export const getProxyStatus = (port) => {
  const userPreferences = new UserPreferenceFetcher();
  const DEFAULT_PROXY_PORT = userPreferences.getConfig().defaultPort;
  port = port || DEFAULT_PROXY_PORT;

  if (process.platform === "darwin") {
    return {
      http: isHttpProxyRunning(port),
      https: isHttpsProxyRunning(port),
    };
  } else if (process.platform === "win32") {
    const result = isWindowsProxyRunning(port);
    return {
      http: result,
      https: result,
    };
  }

  return {
    http: false,
    https: false,
  };
};
