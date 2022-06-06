const { exec, execSync } = require("child_process");

const installOsxCert = async (cert_path) => {
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
    -k $HOME/Library/Keychains/login.keychain \\"${cert_path}\\"\
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

export { installOsxCert };
