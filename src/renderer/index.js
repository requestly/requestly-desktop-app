
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
import { LocalFileSync } from "./actions/local-files";
import { TestService } from "./actions/local-files/sample/service";
import { FsManagerBuilderRPCService } from "./actions/local-sync/fs-manager-builder.rpc-service";

// initPrimaryStorageCache();
initRulesCache();
initGroupsCache();
/** IPC  **/
initEventHandlers();
initAppManager();

// import "../utils/sentryInit";
// const LocalFileSyncer = new LocalFileSync();
// LocalFileSyncer.init();

// const TestServiceServer = new TestService();

// eslint-disable-next-line no-unused-vars, no-new
new FsManagerBuilderRPCService();
