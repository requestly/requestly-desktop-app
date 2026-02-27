const Sentry = require("@sentry/electron/main");
import { createTracedHandler } from "../lib/tracingMainUtils";

/**
 * Wraps IPC handlers in the main process with distributed tracing
 * @param {string} operationName - Name of the IPC operation
 * @param {Function} handler - The actual handler function
 * @returns {Function} Traced handler
 */
export const withTracing = (operationName, handler) => {
  return createTracedHandler({
    operationName,
    op: "Electron-ipc.main.handle",
    processName: "main",
    Sentry,
  })(handler);
};
