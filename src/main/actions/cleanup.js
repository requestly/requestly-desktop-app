const { app, ipcMain } = require("electron");

const cleanup = () => {
  if(global.backgroundProcessStarted) {
    console.log("[debug] backgroundProcessStarted")
    if (global.backgroundWindow) {
      global.backgroundWindow.webContents.send("shutdown");
    } else {
      // No backgroundWindow. Quit directly without cleanup
      app.quit();
    }
  } else {
    console.log("[Debug] No background process started. Quitting app directly.");
    app.quit();
  }
};


export const getReadyToQuitApp = async  () => {
  return new Promise((resolve) => {
    cleanup();
  
    console.log("[Debug]", global.backgroundWindow)
    if (global.backgroundWindow) {
      ipcMain.once("shutdown-success", () => {
        console.log("shudown sucess");
        global.backgroundWindow?.close();
        resolve()
      });
    }
  })
};