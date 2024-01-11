const { exec, execSync } = require("child_process");

const installWindowsCert = async (certPath) => {
  const command = `certutil -user -addstore Root ${certPath}`;
  try {
    execSync(command);
    console.log(`${command} executed succesfully`);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

const deleteWindowsCert = async(caName) => {
  console.log("Deleting Windows Cert")
  const command = `certutil -delstore -user Root ${caName}`;
  try {
    execSync(command);
    console.log(`${command} executed succesfully`);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export { installWindowsCert, deleteWindowsCert };
