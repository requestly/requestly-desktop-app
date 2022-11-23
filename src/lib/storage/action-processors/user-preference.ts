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
        return this.store.getAll()
      case USER_PREFERENCE.GET_DEFAULT_PORT:
        return this.store.get("defaultPort")
      case USER_PREFERENCE.UPDATE_DEFAULT_PORT:
        this.store.set({"defaultPort": payload?.data})
        break;
      default:
        console.log("unexpected user preference action", type, payload)
    }
  };
}

export default UserPreferenceActionProcessor
