import * as PrimaryStorageService from "./primaryStorage";
/** UTILS */
import { filterSuperObjectByType } from "../../utils/storage";
/** CONSTANTS */
import { CONSTANTS as GLOBAL_CONSTANTS } from "@requestly/requestly-core";
// SENTRY
import * as Sentry from "@sentry/browser";

const initGroupsCache = () => {
  return PrimaryStorageService.getStorageSuperObject()
    .then((allRecords) => {
      let groupsCache = filterSuperObjectByType(
        allRecords,
        GLOBAL_CONSTANTS.OBJECT_TYPES.GROUP
      ); // Default value

      /* Getter & Setter */
      Object.defineProperty(global, "groupsCache", {
        get() {
          return groupsCache;
        },
        set(value) {
          groupsCache = value;
        },
      });
    })
    .catch((e) => {
      Sentry.captureException(e);
      console.error(e.message);
    });
};

export default initGroupsCache;
