const getCurrentNetworkLogs = () => {
  return new Promise((resolve) => {
    const currentLog = global.networkRequestsLog;
    resolve(currentLog);
  });
};

export default getCurrentNetworkLogs;
