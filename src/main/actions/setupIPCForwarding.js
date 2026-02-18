import { ipcMain } from "electron";

// --- Background readiness protocol ---
// Buffer IPC calls until the background process signals it's ready.
let isBackgroundReady = false;
let isBackgroundFailed = false;
const pendingCalls = [];
const BACKGROUND_READY_TIMEOUT_MS = 30_000;
const PER_CALL_TIMEOUT_MS = 60_000;

export const setupIPCForwardingToBackground = (backgroundWindow) => {
  // Reset state in case background process was restarted
  isBackgroundReady = false;
  isBackgroundFailed = false;
  pendingCalls.length = 0;

  // Safety net: if background never signals ready, reject all buffered calls
  // and mark as failed so new calls are rejected immediately
  const readyTimeoutId = setTimeout(() => {
    if (!isBackgroundReady) {
      isBackgroundFailed = true;
      while (pendingCalls.length > 0) {
        const { resolve } = pendingCalls.shift();
        resolve({
          success: false,
          data: "Background process failed to initialize in time",
        });
      }
    }
  }, BACKGROUND_READY_TIMEOUT_MS);

  ipcMain.once("background-process-ready", () => {
    clearTimeout(readyTimeoutId);
    isBackgroundReady = true;
    isBackgroundFailed = false;

    // Flush all buffered calls in order
    while (pendingCalls.length > 0) {
      const {
        eventName,
        actualPayload,
        replyChannel,
        callId,
        resolve,
        startTime,
      } = pendingCalls.shift();
      try {
        forwardToBackground(
          backgroundWindow,
          eventName,
          actualPayload,
          replyChannel,
          callId,
          resolve,
          startTime
        );
      } catch (err) {
        resolve({ success: false, data: `Flush error: ${err.message}` });
      }
    }
  });

  ipcMain.handle(
    "forward-event-from-webapp-to-background-and-await-reply",
    async (event, incomingData) => {
      const { actualPayload, eventName } = incomingData;

      // Unique reply channel per call to prevent race conditions with concurrent calls
      const callId = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`;
      const replyChannel = `reply-${eventName}-${callId}`;
      const startTime = performance.now();

      return new Promise((resolve) => {
        // If background failed to init, reject immediately instead of buffering forever
        if (isBackgroundFailed) {
          resolve({
            success: false,
            data: "Background process is not available",
          });
          return;
        }

        if (!isBackgroundReady) {
          pendingCalls.push({
            eventName,
            actualPayload,
            replyChannel,
            callId,
            resolve,
            startTime,
          });
          return;
        }

        forwardToBackground(
          backgroundWindow,
          eventName,
          actualPayload,
          replyChannel,
          callId,
          resolve,
          startTime
        );
      });
    }
  );
};

function forwardToBackground(
  backgroundWindow,
  eventName,
  actualPayload,
  replyChannel,
  callId,
  resolve,
  startTime = performance.now()
) {
  // Safety: clean up listener if background never replies (crash, unhandled error, etc.)
  const callTimeoutId = setTimeout(() => {
    ipcMain.removeAllListeners(replyChannel);
    resolve({ success: false, data: `IPC call timed out: ${eventName}` });
  }, PER_CALL_TIMEOUT_MS);

  ipcMain.once(replyChannel, (responseEvent, responsePayload) => {
    clearTimeout(callTimeoutId);
    resolve(responsePayload);
  });

  try {
    backgroundWindow.webContents.send(eventName, {
      payload: actualPayload,
      replyChannel,
    });
  } catch (err) {
    clearTimeout(callTimeoutId);
    ipcMain.removeAllListeners(replyChannel);
    resolve({ success: false, data: `Send failed: ${err.message}` });
  }
}

export const setupIPCForwardingToWebApp = (webAppWindow) => {
  ipcMain.handle(
    "forward-event-from-background-to-webapp-and-await-reply",
    async (event, incomingData) => {
      return new Promise((resolve) => {
        const { actualPayload, eventName } = incomingData;
        ipcMain.once(`reply-${eventName}`, (responseEvent, responsePayload) => {
          resolve(responsePayload);
        });
        webAppWindow.webContents.send(eventName, actualPayload);
      });
    }
  );

  ipcMain.on("send-from-background-to-webapp", (event, incomingData) => {
    const { payload, channel } = incomingData;
    console.log("Sending to webapp", channel, payload);
    webAppWindow.webContents.send(channel, payload);
  });
};
