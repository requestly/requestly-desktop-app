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
      case USER_PREFERENCE.GET_COMPLETE_LOGGING_CONFIG:
        return {
          isEnabled: this.store.get("isEnabled"),
          storePath: this.store.get("storePath"),
          filter: this.store.get("filter")
        }

      case USER_PREFERENCE.GET_IS_LOGGING_ENABLED:
        return this.store.get("isEnabled")
      case USER_PREFERENCE.GET_LOCAL_LOG_STORE_PATH:
        return this.store.get("storePath")
      case USER_PREFERENCE.GET_LOG_FILTER:
        return this.store.get("filter")
      
      case USER_PREFERENCE.SET_IS_LOGGING_ENABLED:
        // @ts-ignore
        let isEnabled = payload?.data?.isEnabled
        if (typeof isEnabled === "boolean") {
          this.store.set({"isEnabled": isEnabled})
        }

        if(typeof isEnabled === "string") { // serialization in IPC
          if(
            isEnabled === "false" || 
            isEnabled === "0"
          ) {
            this.store.set({"isEnabled": false})
          } else {
            this.store.set({"isEnabled": true})
          }
        }

        if(!isEnabled) {
          this.store.set({"isEnabled": false})
        }

        break;
      case USER_PREFERENCE.SET_STORE_PATH:
        // @ts-ignore
        const storePath = payload?.data?.storePath
        this.store.set({"storePath": storePath})
        break;
      case USER_PREFERENCE.SET_FILTER:
        // @ts-ignore
        const filter = payload?.data?.filter
        this.store.set({"filter": filter})
        break;

      default:
        console.log("unexpected user preference action", type, payload)
    }
  };
}

export default UserPreferenceActionProcessor