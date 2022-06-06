const { exec, execSync } = require("child_process");

const getProxyAndPort = () => {
  const command = `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer`;
  let output_string;
  try {
    output_string = execSync(command, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    }).toString();
  } catch (e) {
    console.log(e);
    return {
      domain: undefined,
      port: undefined,
    };
  }
  try {
    let re = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{2,5})/;
    const [domain, port] = re.exec(output_string)[0].split(":");
    return { domain, port };
  } catch {
    return {
      domain: null,
      port: null,
    };
  }
};

const isProxyEnabled = () => {
  const command = `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable`;
  try {
    let output_string = execSync(command, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    }).toString();
    let re = /0x[0-1]/;
    const [result] = re.exec(output_string)[0].split(":");
    return Boolean(parseInt(result.split("x")[1]));
  } catch (error) {
    console.log(error);
    return undefined;
  }
};

const getCurrentProxySetup = () => {
  return {
    isEnabled: isProxyEnabled(),
    ...getProxyAndPort(),
  };
};

// Hacky trick to refresh proxy settings
const openAndCloseIE = (close) => {
  const command_start_ie = `start /w /b iexplore.exe "https://amiusing.requestly.io/"`;
  const command_kill_ie = `taskkill /f /im iexplore.exe`;
  exec(command_start_ie);
  if (close) {
    setTimeout(() => exec(command_kill_ie), 500);
  }
};

const applyProxyWindows = (host, port) => {
  const command_activate_proxy = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`;
  const command_set_proxy = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d ${host}:${port}  /f`;
  let status;
  try {
    execSync(command_set_proxy);
    execSync(command_activate_proxy);
    openAndCloseIE(false);
  } catch (error) {
    console.log(error);
  }
};

const removeProxyWindows = () => {
  if (getCurrentProxySetup().isEnabled) {
    const command_disable_proxy = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`;
    try {
      execSync(command_disable_proxy);
      openAndCloseIE(true);
    } catch (error) {
      console.log(error);
    }
  }
};

const isWindowsProxyRunning = (port) => {
  const proxyStatus = getCurrentProxySetup();
  const host = "127.0.0.1";
  console.log(proxyStatus);
  if (
    proxyStatus.isEnabled &&
    proxyStatus.domain == host &&
    proxyStatus.port == port
  ) {
    return true;
  }

  return false;
};

export { applyProxyWindows, removeProxyWindows, isWindowsProxyRunning };
