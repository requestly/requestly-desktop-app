const logNetworkRequestV2 = (event, message, webAppWindow) => {
  const newLog = message;
  if (webAppWindow && !webAppWindow.isDestroyed()) {
    webAppWindow.send("log-network-request-v2", newLog);
  }
};

export default logNetworkRequestV2;
