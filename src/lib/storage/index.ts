import BaseActionProcessor from "./action-processors/base";
import SSLProxyingActionProcessor from "./action-processors/ssl-proxying";
import { STORE_NAME } from "./constants";
import StoreWrapper from "./store-wrapper";
import { StorageAction } from "./types/storage-action";

class StorageService {
  actionProcessors: BaseActionProcessor[];
  sslProxyingStore!: StoreWrapper;
  sslProxyingActionProcessor!: BaseActionProcessor;

  constructor() {
    this.actionProcessors = [];
    this.init();
  }

  init = () => {
    this.initSSLProxying();
  };

  initSSLProxying = () => {
    const storeName = STORE_NAME.SSL_PROXYING;
    this.sslProxyingStore = new StoreWrapper(storeName);
    this.sslProxyingActionProcessor = new SSLProxyingActionProcessor(
      this.sslProxyingStore
    );
    this.actionProcessors.push(this.sslProxyingActionProcessor);
  };

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
