import storageService from "lib/storage";
import { STORE_NAME } from "lib/storage/constants";
import ACTION_TYPES from "lib/storage/types/action-types";

class StorageCacheService {
  constructor() {
    this.init();
  }

  init = () => {
    this.updateCache(STORE_NAME.SSL_PROXYING);
  };

  updateCache = (storeName: string) => {
    if (!storeName) {
      console.log("Storage Name not provided");
    }

    switch (storeName) {
      case STORE_NAME.SSL_PROXYING:
        global.rq.sslProxyingStorage = storageService.processAction({
          type: ACTION_TYPES.SSL_PROXYING.GET_ALL,
        });
        console.log(`Updated ${storeName} cache`);

        // Hack: For timing out tunnel in case of inclusionList/ExclusionList Change
        this.destroySSLTunnels();
        break;
      default:
        console.log(`${storeName} cache not found`);
    }
  };

  getCache = (storeName: string) => {
    if (!storeName) {
      console.log("Storage Name not provided");
    }

    switch (storeName) {
      case STORE_NAME.SSL_PROXYING:
        return global.rq.sslProxyingStorage;
      default:
        console.log(`${storeName} cache not found`);
    }

    return;
  };

  destroySSLTunnels = () => {
    // Check if behvaiour breaks when working with multiple tunnels
    console.log("Destroying tunnels");
    console.log(global.rq.sslTunnelingSocketsMap);
    Object.values(global.rq.sslTunnelingSocketsMap || {}).forEach((socket) => {
      try {
        console.log("Tunnel destroyed");
        socket.destroy();
      } catch {
        console.log("Failed to destroy tunnel");
      }
    });
    global.rq.sslTunnelingSocketsMap = {};
  };
}

const storageCacheService = new StorageCacheService();
export default storageCacheService;
