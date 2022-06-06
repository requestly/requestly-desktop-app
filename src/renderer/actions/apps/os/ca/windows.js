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

export { installWindowsCert };
