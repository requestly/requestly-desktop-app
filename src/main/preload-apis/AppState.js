/* UTILS */
const IPC = require("./IPC");

// Invoke a function in main process to get a state value
const getState = async (stateName) => {
  return IPC.invokeEventInMain("get-state", stateName);
};

// Invoke a function in main process to set a state value
const setState = async (stateName, newValue) => {
  return IPC.invokeEventInMain("set-state", {
    stateName,
    newValue,
  });
};

const STATE_MANAGEMENT = { getState, setState };

module.exports = STATE_MANAGEMENT;
