const { exec } = require("child_process");

let proxyNames = ["http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY"];
const networkServices = ["Wi-Fi"];
let desktopProxyNames = ["webproxy", "securewebproxy"];

const proxyCommands = {
  SET_DESKTOP: "SET_DESKTOP",
  UNSET_DESKTOP: "UNSET_DESKTOP",
  SET_TERMINAL: "SET_TERMINAL",
  UNSET_TERMINAL: "UNSET_TERMINAL",
};

const getExecutionCommand = (
  commandType,
  HOST,
  PORT,
  proxyName,
  serviceName
) => {
  const commandTemplates = {
    SET_DESKTOP: `networksetup -set${proxyName} ${serviceName} ${HOST} ${PORT};`,
    UNSET_DESKTOP: `networksetup -set${proxyName}state ${serviceName} off;`,
    SET_TERMINAL: `export ${proxyName}=${HOST}:${PORT};`,
    UNSET_TERMINAL: `unset ${proxyName};`,
  };

  return commandTemplates[commandType];
};

const getDesktopProxyCommand = (proxyCommand, HOST, PORT) => {
  const executionString = desktopProxyNames.reduce((acc, curr) => {
    let accCopy = acc;
    networkServices.forEach((serviceName) => {
      accCopy = accCopy.concat(
        getExecutionCommand(proxyCommand, HOST, PORT, curr, serviceName)
      );
    });
    return accCopy;
  }, "");
  return executionString;
};

const getTerminalProxyCommand = (proxyCommand, HOST, PORT) => {
  const executionString = proxyNames.reduce(
    (acc, curr) =>
      acc.concat(getExecutionCommand(proxyCommand, HOST, PORT, curr)),
    ""
  );
  return executionString;
};

const getProxyCommand = (proxyCommand, HOST, PORT) => {
  if (proxyCommand.indexOf("DESKTOP") >= 0)
    return getDesktopProxyCommand(proxyCommand, HOST, PORT);
  if (proxyCommand.indexOf("TERMINAL") >= 0)
    return getTerminalProxyCommand(proxyCommand, HOST, PORT);
};

const toggleProxy = (proxyCommand, HOST, PORT) => {
  const executionString = getProxyCommand(proxyCommand, HOST, PORT);
  execute_command(executionString);
};

const execute_command = (command) => {
  exec(command, (error) => {
    if (error) {
      console.log(error);
      return;
    }
    console.log(`Proxy Success: ${command}`);
  });
};

const applyProxyOsx = (HOST, PORT) => {
  proxyNames = ["http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY"];
  desktopProxyNames = ["webproxy", "securewebproxy"];
  toggleProxy(proxyCommands.SET_DESKTOP, HOST, PORT);
  toggleProxy(proxyCommands.SET_TERMINAL, HOST, PORT);
};

const applyHttpProxyOsx = (HOST, PORT) => {
  proxyNames = ["http_proxy", "HTTP_PROXY"];
  desktopProxyNames = ["webproxy"];
  toggleProxy(proxyCommands.SET_DESKTOP, HOST, PORT);
  toggleProxy(proxyCommands.SET_TERMINAL, HOST, PORT);
};

const applyHttpsProxyOsx = (HOST, PORT) => {
  proxyNames = ["https_proxy", "HTTPS_PROXY"];
  desktopProxyNames = ["securewebproxy"];
  toggleProxy(proxyCommands.SET_DESKTOP, HOST, PORT);
  toggleProxy(proxyCommands.SET_TERMINAL, HOST, PORT);
};

const removeProxyOsx = () => {
  proxyNames = ["http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY"];
  desktopProxyNames = ["webproxy", "securewebproxy"];
  toggleProxy(proxyCommands.UNSET_DESKTOP);
  toggleProxy(proxyCommands.UNSET_TERMINAL);
};

export { applyProxyOsx, applyHttpProxyOsx, applyHttpsProxyOsx, removeProxyOsx };
