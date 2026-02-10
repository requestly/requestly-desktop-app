// Initialize Sentry for background renderer (must be first)
import "../utils/sentryInit";
import * as Sentry from "@sentry/electron/renderer";

const initGlobalNamespace = () => {
  global.rq = global.rq || {};
};

initGlobalNamespace();

// Global error handlers for background renderer
process.on("uncaughtException", (error) => {
  console.error("[Background Renderer] Uncaught Exception:", error);
  Sentry.captureException(error);
});

process.on("unhandledRejection", (reason, _promise) => {
  console.error("[Background Renderer] Unhandled Rejection:", reason);
  Sentry.captureException(reason);
});

window.addEventListener("error", (event) => {
  console.error("[Background Renderer] Window Error:", event.error);
  Sentry.captureException(event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[Background Renderer] Unhandled Promise Rejection:", event.reason);
  Sentry.captureException(event.reason);
});

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
/* IPC */
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
