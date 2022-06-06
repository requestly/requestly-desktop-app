import { autoUpdater } from "electron-updater";
import { ipcMain } from "electron";
import log from "electron-log";

// I hope you know what you are doing here
//
//                       :::!~!!!!!:.
//                   .xUHWH!! !!?M88WHX:.
//                 .X*#M@$!!  !X!M$$$$$$WWx:.
//                :!!!!!!?H! :!$!$$$$$$$$$$8X:
//               !!~  ~:~!! :~!$!#$$$$$$$$$$8X:
//              :!~::!H!<   ~.U$X!?R$$$$$$$$MM!
//              ~!~!!!!~~ .:XW$$$U!!?$$$$$$RMM!
//                !:~~~ .:!M"T#$$$$WX??#MRRMMM!
//                ~?WuxiW*`   `"#$$$$8!!!!??!!!
//              :X- M$$$$       `"T#$T~!8$WUXU~
//             :%`  ~#$$$m:        ~!~ ?$$$$$$
//           :!`.-   ~T$$$$8xx.  .xWW- ~""##*"
// .....   -~~:<` !    ~?T#$$@@W@*?$$      /`
// W$@@M!!! .!~~ !!     .:XUW$W!~ `"~:    :
// #"~~`.:x%`!!  !H:   !WM$$$$Ti.: .!WUn+!`
// :::~:!!`:X~ .: ?H.!u "$$$B$$$!W:U!T$$M~
// .~~   :X@!.-~   ?@WTWo("*$$$W$TH$! `
// Wi.~!X$?!-~    : ?$$$B$Wu("**$RM!
// $R@i.~~ !     :   ~$$$$$B$$en:``
// ?MXT@Wx.~    :     ~"##*$$$$M~
class AutoUpdate {
  constructor(webAppWindow) {
    this.webAppWindow = webAppWindow;

    log.transports.file.level = "info";
    autoUpdater.logger = log;
    // Now this is triggered after rendering UI
    // autoUpdater.checkForUpdatesAndNotify();
    this.updateAvailable = false;
    this.availableUpdateDetails = {};
    this.updateDownloaded = false;
    this.downloadedUpdateDetails = {};

    this.init_events();
  }

  init_events = () => {
    autoUpdater.on("update-available", (updateInfo) => {
      this.updateAvailable = true;
      this.availableUpdateDetails = updateInfo;

      if (this.webAppWindow && this.webAppWindow.webContents)
        this.webAppWindow.webContents.send("update-available", updateInfo);
    });

    autoUpdater.on("checking-for-update", () => {
      console.log("checking-for-update");
    });

    autoUpdater.on("update-not-available", () => {
      console.log("update-not-available");
    });

    autoUpdater.on("download-progress", (progressObj) => {
      if (this.webAppWindow && this.webAppWindow.webContents) {
        this.webAppWindow.webContents.send("download-progress", progressObj);
      }
    });

    autoUpdater.on("update-downloaded", (updateInfo) => {
      this.updateDownloaded = true;
      this.downloadedUpdateDetails = updateInfo;

      if (this.webAppWindow && this.webAppWindow.webContents) {
        this.webAppWindow.webContents.send("update-downloaded", updateInfo);
      }
    });

    ipcMain.handle("check-for-updates-and-notify", () => {
      autoUpdater.checkForUpdatesAndNotify();
    });

    ipcMain.handle("quit-and-install", () => {
      global.quitAndInstall = true;
      autoUpdater.quitAndInstall();
    });
  };
}

export default AutoUpdate;
