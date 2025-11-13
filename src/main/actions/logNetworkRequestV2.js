/**
 * @param {Array} array into which element will be pushed
 * @param {number} required max length of array
 * @param {*} element to push
 */
const addToLog = (array, limit, element) => {
  const arrayToModify = [...array];
  if (arrayToModify.length >= limit) {
    arrayToModify.shift();
  }
  arrayToModify.push(element);
  return arrayToModify;
};

const logNetworkRequestV2 = (event, message, webAppWindow) => {
  const newLog = message;
  if (webAppWindow) {
    webAppWindow.send("log-network-request-v2", newLog);
  }
};

export default logNetworkRequestV2;
