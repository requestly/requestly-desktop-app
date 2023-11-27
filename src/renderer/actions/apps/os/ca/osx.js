const { execSync } = require("child_process");

const installOsxCert = async (certPath) => {
  // const command = `security add-trusted-cert \
  // -d -r trustRoot \
  // -k $HOME/Library/Keychains/login.keychain "${cert_path}"\
  // `
  // console.log(command);
  // sudo.exec(command, {"name": "Requestly"}, (error) => {
  //     if (error) {
  //         console.error(error);
  //         return;
  //     }
  //     console.log(`${command} executed`);
  // });

  const command = `osascript -e \
    'do shell script \
    "security add-trusted-cert \
    -r trustRoot \
    -k $HOME/Library/Keychains/login.keychain \\"${certPath}\\"\
    " with prompt "Requestly wants to store SSL certificate to keychain."'`;

  try {
    execSync(command);
    console.log(`${command} executed succesfully`);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

const deleteOsxCert = async (caName) => {
  const command = `osascript -e \
    'do shell script \
    "security delete-certificate -c \\"${caName}\\" $HOME/Library/Keychains/login.keychain \
    " with prompt "Requestly wants to remove SSL certificate from keychain."'`;
  try {
    execSync(command);
    console.log(`${command} executed succesfully`);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export { installOsxCert, deleteOsxCert };
