import ACTION_TYPES from "../types/action-types";
import { StorageAction } from "../types/storage-action";
import BaseActionProcessor from "./base";
import StoreWrapper from "../store-wrapper";
import { ISource } from "../types/ssl-proxying";

class SSLProxyingActionProcessor extends BaseActionProcessor {
  constructor(store: StoreWrapper) {
    super(store);
  }

  process = ({ type, payload }: StorageAction) => {
    switch (type) {
      case ACTION_TYPES.SSL_PROXYING.ENABLE_ALL:
        this.store.set({ enabledAll: true });
        break;
      case ACTION_TYPES.SSL_PROXYING.DISABLE_ALL:
        this.store.set({ enabledAll: false });
        break;
      case ACTION_TYPES.SSL_PROXYING.UPSERT_INCLUSION_LIST_SOURCE:
        if (payload && payload.data && payload.data.id) {
          this.store.set({
            [`inclusionList.${payload.data.id}`]: payload.data,
          });
        }
        break;
      case ACTION_TYPES.SSL_PROXYING.DELETE_INCLUSION_LIST_SOURCE:
        if (payload && payload.id) {
          this.store.delete(`inclusionList.${payload.id}`);
        }
        break;
      case ACTION_TYPES.SSL_PROXYING.UPDATE_INCLUSION_LIST:
        if (payload && payload.data && payload.data) {
          const sourcesList = payload.data || [];
          const inclusionListMap: { [id: string]: ISource } = {};
          sourcesList.forEach((source) => {
            inclusionListMap[source.id] = source;
          });
          this.store.set({ inclusionList: inclusionListMap });
        }
        break;
      case ACTION_TYPES.SSL_PROXYING.CLEAR_INCLUSION_LIST:
        this.store.set({ inclusionList: {} });
        break;
      case ACTION_TYPES.SSL_PROXYING.UPSERT_EXCLUSION_LIST_SOURCE:
        if (payload && payload.data && payload.data.id) {
          this.store.set({
            [`exclusionList.${payload.data.id}`]: payload.data,
          });
        }
        break;
      case ACTION_TYPES.SSL_PROXYING.DELETE_EXCLUSION_LIST_SOURCE:
        if (payload && payload.id) {
          this.store.delete(`exclusionList.${payload.id}`);
        }
        break;
      case ACTION_TYPES.SSL_PROXYING.UPDATE_EXCLUSION_LIST:
        if (payload && payload.data && payload.data) {
          const sourcesList = payload.data || [];
          const exclusionListMap: { [id: string]: ISource } = {};
          sourcesList.forEach((source) => {
            exclusionListMap[source.id] = source;
          });
          this.store.set({ exclusionList: exclusionListMap });
        }
        break;
      case ACTION_TYPES.SSL_PROXYING.CLEAR_EXCLUSION_LIST:
        this.store.set({ exclusionList: {} });
        break;
      case ACTION_TYPES.SSL_PROXYING.GET_ALL:
        return this.store.getAll();
      case ACTION_TYPES.SSL_PROXYING.GET_INCLUSION_LIST:
        const inclusionListMap = this.store.get("inclusionList") || {};
        return Object.values(inclusionListMap);
      case ACTION_TYPES.SSL_PROXYING.GET_EXCLUSION_LIST:
        const exclusionListMap = this.store.get("exclusionList") || {};
        return Object.values(exclusionListMap);
      default:
        console.log("Nothing in SSLProxying action processor");
    }
  };
}

export default SSLProxyingActionProcessor;
