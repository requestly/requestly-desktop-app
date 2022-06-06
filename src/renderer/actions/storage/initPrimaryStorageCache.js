import * as PrimaryStorageService from "./primaryStorage";
import * as Sentry from "@sentry/browser";

const initPrimaryStorageCache = () => {
  return PrimaryStorageService.getStorageSuperObject()
    .then((newVal) => {
      let primaryStorageCache = newVal; // Default value
      /* Getter & Setter */
      Object.defineProperty(global, "primaryStorageCache", {
        get() {
          return primaryStorageCache;
        },
        set(value) {
          primaryStorageCache = value;
        },
      });
    })
    .catch((e) => {
      Sentry.captureException(e);
      console.error(e.message);
    });
};

export default initPrimaryStorageCache;
