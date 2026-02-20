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
      // Set flag to allow background window destruction
      global.allowBackgroundWindowDestruction = true;
      
      ipcMain.once("shutdown-success", () => {
        // When app is actually quitting, use the original destroy
        if (global.backgroundWindow._originalDestroy) {
          global.backgroundWindow._originalDestroy();
        } else {
          global.backgroundWindow.destroy();
        }
        resolve()
      });
      
      // Timeout fallback in case shutdown-success never comes
      setTimeout(() => {
        if (global.backgroundWindow && !global.backgroundWindow.isDestroyed()) {
          if (global.backgroundWindow._originalDestroy) {
            global.backgroundWindow._originalDestroy();
          } else {
            global.backgroundWindow.destroy();
          }
        }
        resolve();
      }, 2000);
    } else {
      resolve();
    }
  })
};