import {USER_PREFERENCE} from "../types/action-types";
import { StorageAction } from "../types/storage-action";
import BaseActionProcessor from "./base";
import StoreWrapper from "../store-wrapper";

class UserPreferenceActionProcessor extends BaseActionProcessor {
  constructor(store: StoreWrapper) {
    super(store);
  }
  process = ({ type, payload }: StorageAction) => {
    switch(type) {
      case USER_PREFERENCE.GET_ALL:
        this.store.getAll()
        break;
      case USER_PREFERENCE.GET_DEFAULT_PORT:
        this.store.get("defaultPort")
        break;
      case USER_PREFERENCE.UPDATE_DEFAULT_PORT:
        this.store.set({"defaultPort": payload})
        break;
      default:
        console.log("unexpected update preference action", type, payload)
    }
  };
}

export default UserPreferenceActionProcessor
