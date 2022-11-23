import { STORE_NAME } from "lib/storage/constants";
// import { UserPreferenceObj } from "lib/storage/types/user-preference";
import storageCacheService from "renderer/services/storage-cache";
import BaseConfigFetcher from "./proxy-interface/base";

class UserPreferenceFetcher implements BaseConfigFetcher {
  getConfig = (): any => {
    return storageCacheService.getCache(STORE_NAME.USER_PREFERENCE)
  };
}

export default UserPreferenceFetcher
