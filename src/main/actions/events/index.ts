/* eslint-disable import/prefer-default-export */
import { BrowserWindow } from "electron";

export const trackEventViaWebApp = (
  webAppWindow: BrowserWindow,
  eventName: string,
  eventParams: Record<any, any> = {}
) => {
  webAppWindow.webContents.send("analytics-event", {
    name: eventName,
    params: eventParams,
    origin: "main",
  });
};
