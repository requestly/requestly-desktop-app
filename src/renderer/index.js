const initGlobalNamespace = () => {
  global.rq = global.rq || {};
};

initGlobalNamespace();

// ACTIONS
import initEventHandlers from "./actions/initEventHandlers";
// import initPrimaryStorageCache from "./actions/storage/initPrimaryStorageCache";
import initRulesCache from "./actions/storage/initRulesCache";
import initGroupsCache from "./actions/storage/initGroupsCache";
import { initAppManager } from "./actions/apps";
import storageService from "lib/storage";
import "./types";

// initPrimaryStorageCache();
initRulesCache();
initGroupsCache();
/** IPC  **/
initEventHandlers();
initAppManager();

import "../utils/sentryInit";
