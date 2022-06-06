/** Do not init any state using this setState since init requires getter & setter */

// Returns the value of state or null if it doenst exist
export const getState = (stateName) => {
  if (global[stateName] !== undefined) {
    return global[stateName];
  } else return null;
};

// Sets the value of state or return null if it doenst exist
export const setState = (stateName, newValue) => {
  if (global[stateName] !== undefined) {
    global[stateName] = newValue;
    return true;
  } else return null;
};
