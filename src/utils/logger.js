// TODO: Centralized logs from renderer process too in main process
const logger = {
  enabled:
    process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true",
  getLogger: function (func) {
    if (this.enabled) return func;
    return () => {};
  },
  formatMsg(msg, tag = "Default") {
    return `[${tag}] ${msg}`;
  },
  error: function (msg, tag) {
    this.getLogger(console.error).call(this, this.formatMsg(msg, tag));
  },
  info: function (msg, tag) {
    this.getLogger(console.info).call(this, this.formatMsg(msg, tag));
  },
  log: function (msg, tag) {
    this.getLogger(console.log).call(this, this.formatMsg(msg, tag));
  },
};

export default logger;
