import { ipcMain } from "electron";

export const setupIPCForwardingToBackground = (backgroundWindow) => {
  let requestIdCounter = 0;
  
  ipcMain.handle(
    "forward-event-from-webapp-to-background-and-await-reply",
    async (event, incomingData) => {
      return new Promise((resolve) => {
        const { actualPayload, eventName } = incomingData;
        // Doing this only for local_sync calls, rest calls are handled by the old code.
        const isRPCCall = eventName && eventName.includes('local_sync');

        if(isRPCCall) {
          // Generate unique ID for this specific request to avoid reply channel collision
            const requestId = `${eventName}-${Date.now()}-${++requestIdCounter}`;

            // Each request gets its own unique reply channel
          ipcMain.once(`reply-${eventName}-${requestId}`, (responseEvent, responsePayload) => {
            resolve(responsePayload);
          });
          
          // Send requestId so background can reply on the correct channel
          backgroundWindow.webContents.send(eventName, { requestId, args: actualPayload });
        }
        else{
          ipcMain.once(`reply-${eventName}`, (responseEvent, responsePayload) => {
            resolve(responsePayload);
          });

          backgroundWindow.webContents.send(eventName, actualPayload);
        }        
      });
    }
  );
};

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
