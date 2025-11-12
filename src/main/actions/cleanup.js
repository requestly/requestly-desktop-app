const { app, ipcMain } = require("electron");

const cleanup = () => {
  if(global.backgroundProcessStarted) {
    if (global.backgroundWindow) {
      global.backgroundWindow.webContents.send("shutdown");
    } else {
      // No backgroundWindow. Quit directly without cleanup
      app.quit();
    }
  } else {
    app.quit();
  }
};


export const getReadyToQuitApp = async  () => {
  return new Promise((resolve) => {
    cleanup();
  
    if (global.backgroundWindow) {
      ipcMain.once("shutdown-success", () => {
        console.log("shudown sucess");
        global.backgroundWindow?.close();
        resolve()
      });
    } else {
      resolve();
    }
  })
};