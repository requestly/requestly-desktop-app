const { execSync } = require("child_process");
import { installOsxCert } from "./osx";
import { installWindowsCert } from "./windows";
import { getCertStatus } from "./utils";

const installCert = async (certPath) => {
  const certStatus = getCertStatus();

  if (certStatus.installed && certStatus.trusted) {
    console.log("Certificate Installed Already");
    return true;
  } else {
    switch (process.platform) {
      case "darwin":
        return installOsxCert(certPath);
      case "win32":
        return installWindowsCert(certPath);
      default:
        console.log(
          `${process.platform} is not supported for systemwide proxy`
        );
        return false;
    }
  }
};

export { installCert };
