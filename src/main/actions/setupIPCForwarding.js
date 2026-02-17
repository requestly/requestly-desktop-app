import { ipcMain } from "electron";

// Track background readiness state and buffer calls until ready
let isBackgroundReady = false;
const pendingCalls = [];

export const setupIPCForwardingToBackground = (backgroundWindow) => {
  // Listen for readiness signal from background process
  ipcMain.once("background-process-ready", () => {
    console.log(
      `[IPC-MAIN] Background process is ready, flushing ${pendingCalls.length} buffered calls`
    );
    isBackgroundReady = true;

    // Flush all buffered calls
    while (pendingCalls.length > 0) {
      const { eventName, actualPayload, replyChannel, callId, resolve } =
        pendingCalls.shift();
      console.log(
        `[IPC-MAIN] Flushing buffered call: ${eventName} (${callId})`
      );
      forwardToBackground(
        backgroundWindow,
        eventName,
        actualPayload,
        replyChannel,
        callId,
        resolve
      );
    }
  });

  ipcMain.handle(
    "forward-event-from-webapp-to-background-and-await-reply",
    async (event, incomingData) => {
      const { actualPayload, eventName } = incomingData;

      // Generate unique reply channel for this specific call to avoid race conditions
      const callId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const replyChannel = `reply-${eventName}-${callId}`;

      const startTime = performance.now();
      console.log(
        `[IPC-MAIN] Forwarding to background: ${eventName} (call: ${callId})`
      );

      return new Promise((resolve) => {
        if (!isBackgroundReady) {
          // Buffer this call until background is ready
          console.log(
            `[IPC-MAIN] Background not ready yet, buffering call: ${eventName} (${callId})`
          );
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

        // Background is ready, forward immediately
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

// Helper function to actually forward to background
function forwardToBackground(
  backgroundWindow,
  eventName,
  actualPayload,
  replyChannel,
  callId,
  resolve,
  startTime = performance.now()
) {
  // Use unique reply channel per call
  ipcMain.once(replyChannel, (responseEvent, responsePayload) => {
    const replyReceiveTime = performance.now() - startTime;
    console.log(
      `[IPC-MAIN] Got reply from background after ${replyReceiveTime.toFixed(
        2
      )}ms: ${eventName} (call: ${callId})`
    );

    const resolveStart = performance.now();
    resolve(responsePayload);

    const resolveTime = performance.now() - resolveStart;
    const totalTime = performance.now() - startTime;
    console.log(
      `[IPC-MAIN] Resolved promise in ${resolveTime.toFixed(
        2
      )}ms, total: ${totalTime.toFixed(2)}ms: ${eventName} (call: ${callId})`
    );
  });

  const sendStart = performance.now();
  // Send both eventName and replyChannel so background knows where to reply
  backgroundWindow.webContents.send(eventName, {
    payload: actualPayload,
    replyChannel,
  });
  const sendTime = performance.now() - sendStart;
  console.log(
    `[IPC-MAIN] Sent to background in ${sendTime.toFixed(
      2
    )}ms: ${eventName} (call: ${callId})`
  );
}

export const setupIPCForwardingToWebApp = (webAppWindow) => {
  ipcMain.handle(
    "forward-event-from-background-to-webapp-and-await-reply",
    async (event, incomingData) => {
      const { actualPayload, eventName } = incomingData;

      // Generate unique reply channel for this specific call
      const callId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const replyChannel = `reply-${eventName}-${callId}`;

      const startTime = performance.now();
      console.log(
        `[IPC-MAIN] Forwarding to webapp: ${eventName} (call: ${callId})`
      );

      return new Promise((resolve) => {
        ipcMain.once(replyChannel, (responseEvent, responsePayload) => {
          const replyReceiveTime = performance.now() - startTime;
          console.log(
            `[IPC-MAIN] Got reply from webapp after ${replyReceiveTime.toFixed(
              2
            )}ms: ${eventName} (call: ${callId})`
          );

          const resolveStart = performance.now();
          resolve(responsePayload);

          const resolveTime = performance.now() - resolveStart;
          const totalTime = performance.now() - startTime;
          console.log(
            `[IPC-MAIN] Resolved promise in ${resolveTime.toFixed(
              2
            )}ms, total: ${totalTime.toFixed(
              2
            )}ms: ${eventName} (call: ${callId})`
          );
        });

        const sendStart = performance.now();
        webAppWindow.webContents.send(eventName, {
          payload: actualPayload,
          replyChannel,
        });
        const sendTime = performance.now() - sendStart;
        console.log(
          `[IPC-MAIN] Sent to webapp in ${sendTime.toFixed(
            2
          )}ms: ${eventName} (call: ${callId})`
        );
      });
    }
  );

  ipcMain.on("send-from-background-to-webapp", (event, incomingData) => {
    const { payload, channel } = incomingData;
    console.log("Sending to webapp", channel, payload);
    webAppWindow.webContents.send(channel, payload);
  });
};
