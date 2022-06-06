import { ipcRenderer } from "electron";

export const getStorageSuperObject = () => {
  return ipcRenderer.invoke("get-storage-super-object");
};

export const getStorageObject = (key) => {
  return ipcRenderer.invoke("get-storage-object", key);
};

export const setStorageObject = (object) => {
  return ipcRenderer.invoke("set-storage-object", object);
};

export const deleteItem = (key) => {
  return ipcRenderer.invoke("delete-item", key);
};

export const clearStorage = () => {
  return ipcRenderer.invoke("clear-storage");
};
