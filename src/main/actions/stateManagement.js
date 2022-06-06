// Returns the value of state or null if it doesn't exist
export const getState = async (event, payload) => {
  const stateName = payload;
  if (global[stateName] !== undefined) {
    return Promise.resolve(global[stateName]);
  }
  return Promise.resolve(null);
};

// Sets the value of state or return null if it doesn't exist
export const setState = async (event, payload) => {
  const { stateName, newValue } = payload;
  if (global[stateName] !== undefined) {
    global[stateName] = newValue;
    return Promise.resolve(newValue);
  }
  return Promise.resolve(null);
};
