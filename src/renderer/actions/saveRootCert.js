const { dialog, app } = require("@electron/remote");
const fs = require("fs-extra");
const path = require("path");
//CONFIG
import { staticConfig } from "../config";
// Sentry
import * as Sentry from "@sentry/browser";

var options = {
  title: "Save root certificate",
  defaultPath: path.join(app.getPath("desktop"), "RQProxyCA.pem"),
  buttonLabel: "Save certificate",

  filters: [{ name: "pem", extensions: ["pem"] }],
  properties: ["createDirectory"],
};

const saveRootCert = async () => {
  return dialog
    .showSaveDialog(null, options)
    .then(async ({ filePath }) => {
      return fs
        .copy(staticConfig.ROOT_CERT_PATH, filePath)
        .then(() => {
          return { success: true };
        })
        .catch((err) => {
          Sentry.captureException(err);
          return { success: false };
        });
    })
    .catch((e) => {
      Sentry.captureException(e);
      console.error(e.message);
      return { success: false };
    });
};

export default saveRootCert;
