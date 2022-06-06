import * as PrimaryStorageService from "./primaryStorage";
/** UTILS */
import { filterSuperObjectByType } from "../../utils/storage";
/** CONSTANTS */
import { CONSTANTS as GLOBAL_CONSTANTS } from "requestly-master";
// SENTRY
import * as Sentry from "@sentry/browser";

const initRulesCache = () => {
  return PrimaryStorageService.getStorageSuperObject()
    .then((allRecords) => {
      let rulesCache = filterSuperObjectByType(
        allRecords,
        GLOBAL_CONSTANTS.OBJECT_TYPES.RULE
      ); // Default value

      /* Getter & Setter */
      Object.defineProperty(global, "rulesCache", {
        get() {
          return rulesCache;
        },
        set(value) {
          rulesCache = value;
        },
      });
    })
    .catch((e) => {
      Sentry.captureException(e);
      console.error(e.message);
    });
};

export default initRulesCache;
