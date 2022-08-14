const { exec, execSync } = require("child_process");

export const isCertificateInstalled = () => {
  let status = false;
  let command;
  switch (process.platform) {
    case "darwin":
      command = `security find-certificate -c RQProxyCA $HOME/Library/Keychains/login.keychain`;
      break;
    case "win32":
      command = `certutil -user -verifystore Root RQProxyCA`;
      break;
    default:
      console.log(`${process.platform} is not supported for systemwide proxy`);
      return false;
  }

  try {
    status = !!execSync(command);
    console.log("Found CA already installed");
  } catch (err) {
    console.error(err);
    console.log("CA not found");
  }
  // console.log(status);
  return status;
};

const is_rq_cert_trusted = (trust_settings_str) => {
  let re = /(Cert \d+: RQProxyCA[\s\S]*?(?=Cert))|(Cert \d+: RQProxyCA[\s\S]*)/gm;
  const rq_cert_settings = re.exec(trust_settings_str);

  if (
    rq_cert_settings &&
    !rq_cert_settings[0].includes("kSecTrustSettingsResultDeny")
  ) {
    return true;
  }

  return false;
};

export const isCertificateTrusted = () => {
  switch (process.platform) {
    case "darwin":
      try {
        const trust_settings_output = execSync(`security dump-trust-settings`);
        return is_rq_cert_trusted(trust_settings_output);
      } catch (err) {
        console.error(err);
        console.log("Trust Settings not found");
        return false;
      }
    case "win32": // in windows, if cert is installed, it is trusted
      return isCertificateInstalled();
    default:
      console.log(`${process.platform} is not supported for systemwide proxy`);
      return false;
  }
};

export const getCertStatus = () => {
  if (process.platform === "darwin" || process.platform === "win32") {
    return {
      installed: isCertificateInstalled(),
      trusted: isCertificateTrusted(),
    };
  }

  return {
    installed: false,
    trusted: false,
  };
};
