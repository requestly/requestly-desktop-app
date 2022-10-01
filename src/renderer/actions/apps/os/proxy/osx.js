import { promisify } from "util";
import * as _ from "lodash";
const { exec } = require("child_process");
const promisifiedExec = promisify(exec)

let proxyNames = ["http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY"];
const networkServices = ["Wi-Fi"];
let desktopProxyNames = ["webproxy", "securewebproxy"];
const RQBypassDomains = ["meet.google.com"]

const proxyCommands = {
  SET_DESKTOP: "SET_DESKTOP",
  UNSET_DESKTOP: "UNSET_DESKTOP",
  SET_TERMINAL: "SET_TERMINAL",
  UNSET_TERMINAL: "UNSET_TERMINAL",
  SET_BYPASS: "SET_BYPASS",
  UNSET_BYPASS: "UNSET_BYPASS",
};

/* MAINTAINING BYPASS LIST */
// @nsr move to separate file when providing this as a feature
let originalBypassDomains = {}
let bypassDomains = {}

networkServices.forEach(async serviceName => {
  bypassDomains[serviceName] = await getBypassDomainsList(serviceName);
})

async function getBypassDomainsList(serviceName) {
  let cmdOutput = await promisifiedExec(`networksetup -getproxybypassdomains ${serviceName};`)
  if (
    !cmdOutput.stderr &&
    !cmdOutput.stdout.includes("There aren't any bypass domains set") >=0
  ) {
    originalBypassDomains[serviceName] = cmdOutput.stdout.trim().split("\n")
  }

  return _.union(originalBypassDomains[serviceName], RQBypassDomains);
}

const getBypassString = (service) => {
  return bypassDomains[service] ? bypassDomains[service].join(" ") : "";
}
const getOriginalBypassString = (service) => {
  return originalBypassDomains[service]?.length ? originalBypassDomains[service].join(" ") : "Empty";
}

// TODO fix/rewrite:
// this function just returns the command of commandType
// but it updates all the other strings too, very inefficient
function getExecutionCommand (
  commandType,
  HOST,
  PORT,
  proxyName,
  serviceName
) {
  const bypassString = getBypassString(serviceName)
  const originalBypassString = getOriginalBypassString(serviceName)
  const commandTemplates = {
    SET_DESKTOP: `networksetup -set${proxyName} ${serviceName} ${HOST} ${PORT};`,
    UNSET_DESKTOP: `networksetup -set${proxyName}state ${serviceName} off;`,
    SET_TERMINAL: `export ${proxyName}=${HOST}:${PORT};`,
    UNSET_TERMINAL: `unset ${proxyName};`,
    SET_BYPASS: `networksetup -setproxybypassdomains ${serviceName} ${bypassString};`,
    UNSET_BYPASS: `networksetup -setproxybypassdomains ${serviceName} ${originalBypassString};`
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
  if (
    proxyCommand.indexOf("DESKTOP") >= 0 ||
    proxyCommand.indexOf("BYPASS") >= 0
  )
    return getDesktopProxyCommand(proxyCommand, HOST, PORT);
  if (proxyCommand.indexOf("TERMINAL") >= 0)
    return getTerminalProxyCommand(proxyCommand, HOST, PORT);
};

// todo: this is just an executor right now
// should rewrite this to only toggle services
const toggleProxy = (proxyCommand, HOST, PORT) => {
  const executionString = getProxyCommand(proxyCommand, HOST, PORT);
  executeCommand(executionString);
};

const executeCommand = (command) => {
  exec(command, (error) => {
    if (error) {
      console.log(error);
      return;
    }
  });
};

const applyProxyOsx = (HOST, PORT) => {
  proxyNames = ["http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY"];
  desktopProxyNames = ["webproxy", "securewebproxy"];
  toggleProxy(proxyCommands.SET_BYPASS, HOST, PORT);
  toggleProxy(proxyCommands.SET_DESKTOP, HOST, PORT);
  toggleProxy(proxyCommands.SET_TERMINAL, HOST, PORT);
};

// unused
const applyHttpProxyOsx = (HOST, PORT) => {
  proxyNames = ["http_proxy", "HTTP_PROXY"];
  desktopProxyNames = ["webproxy"];
  toggleProxy(proxyCommands.SET_BYPASS, HOST, PORT);
  toggleProxy(proxyCommands.SET_DESKTOP, HOST, PORT);
  toggleProxy(proxyCommands.SET_TERMINAL, HOST, PORT);
};

// unused
const applyHttpsProxyOsx = (HOST, PORT) => {
  proxyNames = ["https_proxy", "HTTPS_PROXY"];
  desktopProxyNames = ["securewebproxy"];
  toggleProxy(proxyCommands.SET_BYPASS, HOST, PORT);
  toggleProxy(proxyCommands.SET_DESKTOP, HOST, PORT);
  toggleProxy(proxyCommands.SET_TERMINAL, HOST, PORT);
};

const removeProxyOsx = () => {
  proxyNames = ["http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY"];
  desktopProxyNames = ["webproxy", "securewebproxy"];
  toggleProxy(proxyCommands.UNSET_BYPASS);
  toggleProxy(proxyCommands.UNSET_DESKTOP);
  toggleProxy(proxyCommands.UNSET_TERMINAL);
};

export { applyProxyOsx, applyHttpProxyOsx, applyHttpsProxyOsx, removeProxyOsx };
