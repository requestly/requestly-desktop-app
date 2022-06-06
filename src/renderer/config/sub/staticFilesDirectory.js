const path = require("path");
const isDevelopment =
  process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true";

const STATIC_FILES_DIR = isDevelopment
  ? path.resolve(__dirname, "../../../../../../release/app/static")
  : path.join(__dirname, "../../../static"); // Resources Folder

module.exports = STATIC_FILES_DIR;
