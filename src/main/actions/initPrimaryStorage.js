const Store = require("electron-store");

const thisStore = new Store({
  name: "primaryStorage",
  watch: true,
});

export const getStorageSuperObject = () => {
  return thisStore.store;
};

export const getStorageObject = (key) => {
  return thisStore.get(key);
};

export const setStorageObject = (object) => {
  thisStore.set(object);
};

export const deleteItem = (key) => {
  thisStore.delete(key);
};

export const clearStorage = () => {
  thisStore.clear();
};

// Update cache in bg process
thisStore.onDidAnyChange((newVal) => {
  if (global.backgroundWindow)
    global.backgroundWindow.send("primary-storage-updated", newVal);
});
