const Store = require("electron-store");

class StoreWrapper {
  storeName: string;
  store: typeof Store;
  constructor(storeName: string, schema?: any) {
    if (!storeName) {
      // throw Error("No store name given");
      console.log("No store Name given");
    }

    this.storeName = storeName;
    const storeProperties = {
      name: storeName,
      cwd: "storage",
      watch: true,
    }
    if(schema) {
      // @ts-ignore
      storeProperties.schema = schema
    }
    this.store = new Store(storeProperties);

    this.initListener();
  }

  getAll = () => {
    return this.store.store;
  };

  get = (key: string) => {
    return this.store.get(key);
  };

  set = (object: any) => {
    this.store.set(object);
  };

  delete = (key: string) => {
    this.store.delete(key);
  };

  clear = () => {
    this.store.clear();
  };

  initListener = () => {
    this.store.onDidAnyChange(() => {
      // @ts-ignore
      if (global.backgroundWindow)
        console.log("DBG: store updated", this.storeName);
        // @ts-ignore
        global.backgroundWindow.send("rq-storage:storage-updated", {
          storeName: this.storeName,
        });
    });
  };
}

export default StoreWrapper;
