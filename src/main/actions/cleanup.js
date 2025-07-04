const { app, ipcMain } = require("electron");

export const cleanupAndQuit = () => {
  // eslint-disable-next-line no-use-before-define
  cleanup();

  if (global.backgroundWindow) {
    ipcMain.on("shutdown-success", () => {
      console.log("shudown sucess");
      app.quit();
    });
  }
};

const cleanup = () => {
  if (global.backgroundWindow) {
    global.backgroundWindow.webContents.send("shutdown");
  } else {
    // No backgroundWindow. Quit directly without cleanup
    app.quit();
  }
};
