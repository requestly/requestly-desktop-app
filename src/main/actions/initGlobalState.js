let isBackgroundProcessActive = false; // Default value
/* Getter & Setter */
Object.defineProperty(global, "isBackgroundProcessActive", {
  get() {
    return isBackgroundProcessActive;
  },
  set(value) {
    isBackgroundProcessActive = value;
  },
});

/**
 *  NetworkRequestsLog is in state since it will help us persist old logs even when user navigates away from the Live Traffic table in the frontend
 *  An alternative could be to log network traffic in the global state of the react app
 */
let networkRequestsLog = []; // Default value = Empty logs
/* Getter & Setter */
Object.defineProperty(global, "networkRequestsLog", {
  get() {
    return networkRequestsLog;
  },
  set(value) {
    networkRequestsLog = value;
  },
});

let backgroundWindow = null; // Default value
/* Getter & Setter */
Object.defineProperty(global, "backgroundWindow", {
  get() {
    return backgroundWindow;
  },
  set(value) {
    backgroundWindow = value;
  },
});

let isQuitActionConfirmed = false; // Default value
/* Getter & Setter */
Object.defineProperty(global, "isQuitActionConfirmed", {
  get() {
    return isQuitActionConfirmed;
  },
  set(value) {
    isQuitActionConfirmed = value;
  },
});

let quitAndInstall = false; // Default value
/* Getter & Setter */
Object.defineProperty(global, "quitAndInstall", {
  get() {
    return quitAndInstall;
  },
  set(value) {
    quitAndInstall = value;
  },
});
