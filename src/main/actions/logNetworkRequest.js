const logNetworkRequest = (event, message, webAppWindow) => {
  const newLog = message;
  if (webAppWindow) {
    webAppWindow.send("log-network-request", newLog);
  }
};

export default logNetworkRequest;
