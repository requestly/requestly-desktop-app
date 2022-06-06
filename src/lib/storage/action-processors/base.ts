import StoreWrapper from "../store-wrapper";
import { StorageAction } from "../types/storage-action";

class BaseActionProcessor {
  store: StoreWrapper;

  constructor(store: StoreWrapper) {
    if (!store) {
      // throw Error;
      console.log("No store given");
    }

    this.store = store;
  }

  process = ({ type, payload }: StorageAction) => {
    // Handle all the different actions here
    console.log(type);
    console.log(payload);
  };
}

export default BaseActionProcessor;
