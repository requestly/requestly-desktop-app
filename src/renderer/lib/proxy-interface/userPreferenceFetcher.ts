import { STORE_NAME } from "lib/storage/constants";
import { UserPreferenceObj } from "lib/storage/types/user-preference";
import storageCacheService from "renderer/services/storage-cache";
import BaseConfigFetcher from "./base";

class UserPreferenceFetcher implements BaseConfigFetcher {
  getConfig = (): UserPreferenceObj => {
    return storageCacheService.getCache(STORE_NAME.USER_PREFERENCE) as UserPreferenceObj
  };
}

export default UserPreferenceFetcher
