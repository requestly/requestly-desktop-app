const IPC = require("./IPC");

class DesktopStorageService {
  getStorageSuperObject = () => {
    return IPC.invokeEventInMain("get-storage-super-object");
  };

  getStorageObject = (key) => {
    return IPC.invokeEventInMain("get-storage-object", key);
  };

  setStorageObject = (object) => {
    return IPC.invokeEventInMain("set-storage-object", object);
  };

  deleteItem = (key) => {
    return IPC.invokeEventInMain("delete-item", key);
  };

  clearStorage = () => {
    return IPC.invokeEventInMain("clear-storage");
  };
}

module.exports = DesktopStorageService;
