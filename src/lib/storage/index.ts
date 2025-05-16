import AccessedFilesProcessor from "./action-processors/accessed-files";
import BaseActionProcessor from "./action-processors/base";
import SSLProxyingActionProcessor from "./action-processors/ssl-proxying";
import UserPreferenceActionProcessor from "./action-processors/user-preference";
import LogConfigActionProcessor from "./action-processors/offline-log-config";
import { STORE_NAME } from "./constants";
import { userPreferenceSchema } from "./schemas/userPreferenceSchema";
import StoreWrapper from "./store-wrapper";
import { StorageAction } from "./types/storage-action";
import { offlinelogConfigSchema } from "./schemas/offlineLogConfigSchema";

class StorageService {
  actionProcessors: BaseActionProcessor[];

  sslProxyingStore!: StoreWrapper;

  userPreferenceStore!: StoreWrapper;

  accesssedFileStore!: StoreWrapper;

  offlineLogConfigStore!: StoreWrapper;

  sslProxyingActionProcessor!: BaseActionProcessor;

  userPreferenceActionProcessor!: BaseActionProcessor;

  accessFileActionProcessor!: BaseActionProcessor;

  offlineLogConfigActionProcessor!: BaseActionProcessor;

  constructor() {
    this.actionProcessors = [];
    this.init();
  }

  init = () => {
    this.initSSLProxying();
    this.initUserPreferences();
    this.initAccessFileStore();
    this.initOfflineLogConfigStore();
  };

  initSSLProxying = () => {
    const storeName = STORE_NAME.SSL_PROXYING;
    this.sslProxyingStore = new StoreWrapper(storeName);
    this.sslProxyingActionProcessor = new SSLProxyingActionProcessor(
      this.sslProxyingStore
    );
    this.actionProcessors.push(this.sslProxyingActionProcessor);
  };

  initUserPreferences = () => {
    const storeName = STORE_NAME.USER_PREFERENCE;
    this.userPreferenceStore = new StoreWrapper(
      storeName,
      userPreferenceSchema
    );
    this.userPreferenceActionProcessor = new UserPreferenceActionProcessor(
      this.userPreferenceStore
    );
    this.actionProcessors.push(this.userPreferenceActionProcessor);
  };

  initAccessFileStore = () => {
    const storeName = STORE_NAME.ACCESSED_FILES;
    this.accesssedFileStore = new StoreWrapper(storeName);
    this.accessFileActionProcessor = new AccessedFilesProcessor(
      this.accesssedFileStore
    );
    this.actionProcessors.push(this.accessFileActionProcessor);
  };

  initOfflineLogConfigStore = () => {
    const storeName = STORE_NAME.OFFLINE_LOG_CONFIG;
    this.offlineLogConfigStore = new StoreWrapper(
      storeName,
      offlinelogConfigSchema
    );
    this.offlineLogConfigActionProcessor = new LogConfigActionProcessor(
      this.offlineLogConfigStore
    );
    this.actionProcessors.push(this.offlineLogConfigActionProcessor);
  }

  /**
   *
   * @param {*} action: {type: ACTION_TYPES, payload: any}
   */
  processAction = (action: StorageAction) => {
    let result: any;
    this.actionProcessors.forEach((processor) => {
      if (result) return;
      result = processor.process(action);
    });

    return result;
  };
}

const storageService = new StorageService();

export default storageService;
