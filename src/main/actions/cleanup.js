const { app, ipcMain } = require("electron");

export const getReadyToQuitApp = async  () => {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-use-before-define
    cleanup();
  
    if (global.backgroundWindow) {
      ipcMain.once("shutdown-success", () => {
        console.log("shudown sucess");
        global.backgroundWindow?.close();
        resolve()
      });
    }
  })
};

const cleanup = () => {
  if (global.backgroundWindow) {
    global.backgroundWindow.webContents.send("shutdown");
  } else {
    // No backgroundWindow. Quit directly without cleanup
    app.quit();
  }
};
