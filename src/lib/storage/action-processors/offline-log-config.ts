import {OFFLINE_LOG_CONFIG} from "../types/action-types";
import { StorageAction } from "../types/storage-action";
import BaseActionProcessor from "./base";
import StoreWrapper from "../store-wrapper";
import { ISource } from "../types/offline-log-config";

class offlineLogConfigActionProcessor extends BaseActionProcessor {
  constructor(store: StoreWrapper) {
    super(store);
  }
  process = ({ type, payload }: StorageAction) => {
    switch(type) {
      case OFFLINE_LOG_CONFIG.GET_ALL:
        console.log("DBG: get all config", this.store.getAll())
        return this.store.getAll()

      // case OFFLINE_LOG_CONFIG.ALL:
      //   const config: {
      //     logStorePath: string,
      //     logFilter: string[],
      //     isLoggingEnabled: boolean
      //   } = {
      //     logStorePath: this.store.get("logStorePath"),
      //     logFilter: this.store.get("logFilter"),
      //     isLoggingEnabled: this.store.get("isLoggingEnabled")
      //   }

      //   console.log("DBG: config, ", config)
      //   return config

      case OFFLINE_LOG_CONFIG.GET_IS_LOGGING_ENABLED:
        return this.store.get("isEnabled")
      case OFFLINE_LOG_CONFIG.GET_STORE_PATH:
        return this.store.get("storePath")
      case OFFLINE_LOG_CONFIG.GET_FILTER:
        return this.store.get("filter")
      
      case OFFLINE_LOG_CONFIG.SET_IS_LOGGING_ENABLED:
        // @ts-ignore
        let isEnabled = payload?.data?.isEnabled
        console.log("DBG-2: set isEnabled", isEnabled)
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
      case OFFLINE_LOG_CONFIG.SET_STORE_PATH:
        // @ts-ignore
        const storePath = payload?.data?.storePath
        console.log("DBG-2: set storePath", storePath)
        this.store.set({"storePath": storePath})
        break;
      case OFFLINE_LOG_CONFIG.SET_FILTER:
        // @ts-ignore
        const filter = payload?.data?.filter
        console.log("DBG-2: set filter", filter)
        this.store.set({"filter": filter})
        break;

      default:
        console.log("unexpected user preference action", type, payload)
    }
  };
}

export default offlineLogConfigActionProcessor
