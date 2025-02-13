import { ipcMain } from "electron";

export const setupIPCForwardingToBackground = (backgroundWindow) => {
  ipcMain.handle(
    "forward-event-from-webapp-to-background-and-await-reply",
    async (event, incomingData) => {
      return new Promise((resolve) => {
        const { actualPayload, eventName } = incomingData;
        ipcMain.once(`reply-${eventName}`, (responseEvent, responsePayload) => {
          resolve(responsePayload);
        });
        backgroundWindow.webContents.send(eventName, actualPayload);
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
