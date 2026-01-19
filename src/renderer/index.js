
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
import "./types";
import { FsManagerBuilderRPCService } from "./actions/local-sync/fs-manager-builder.rpc-service";
import { clearStoredLogs } from "./lib/proxy-interface/loggerService";

// initPrimaryStorageCache();
initRulesCache();
initGroupsCache();
/** IPC  **/
initEventHandlers();
initAppManager();
/* stored logs */
clearStoredLogs();

// import "../utils/sentryInit";
// const LocalFileSyncer = new LocalFileSync();
// LocalFileSyncer.init();

// const TestServiceServer = new TestService();

// eslint-disable-next-line no-unused-vars, no-new
new FsManagerBuilderRPCService();

/**
 * Cap'n Web RPC Setup (parallel to existing IPC system)
 * This initializes the HelloWorld service for testing Cap'n Web integration
 */
import { initCapnWebRpc } from "./capnweb";
initCapnWebRpc();
