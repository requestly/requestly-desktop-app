var portfinder = require("portfinder");
import * as Sentry from "@sentry/browser";

const getNextAvailablePort = async (port) => {
  portfinder.basePort = port;
  let availPort;
  try {
    availPort = await portfinder.getPortPromise();
  } catch (error) {
    Sentry.captureException(error);
    return false;
  }
  return availPort;
};

export default getNextAvailablePort;
