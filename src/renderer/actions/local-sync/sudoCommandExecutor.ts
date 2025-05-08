import { FsUnix } from "./fs-unix";
import { FsWindows } from "./fs-windows";

const sudo = require("@vscode/sudo-prompt");

const options = {
  name: "Requestly",
};

function getProvider() {
  return process.platform === "win32" ? FsWindows : FsUnix;
}

export class SudoCommandExecutor {
  static execCommand(command: string) {
    return new Promise((resolve, reject) => {
      sudo.exec(command, options, (error: any) => {
        if (error) return reject(error);
        return resolve({ success: true });
      });
    });
  }

  static async writeFile(filePath: string, content: string) {
    try {
      const command = getProvider().writeFile(filePath, content) as string;
      return this.execCommand(command);
    } catch (error) {
      return error;
    }
  }

  static async unlink(filePath: string) {
    try {
      const command = getProvider().unlink(filePath) as string;
      return this.execCommand(command);
    } catch (error) {
      return error;
    }
  }

  static async mkdir(dirPath: string) {
    try {
      const command = getProvider().mkdir(dirPath) as string;
      return this.execCommand(command);
    } catch (error) {
      return error;
    }
  }

  static async rmdir(dirPath: string) {
    try {
      const command = getProvider().rmdir(dirPath) as string;
      return this.execCommand(command);
    } catch (error) {
      return error;
    }
  }

  static async rename(oldPath: string, newPath: string) {
    try {
      const command = getProvider().rename(oldPath, newPath) as string;
      return this.execCommand(command);
    } catch (error) {
      return error;
    }
  }

  static async cp(sourcePath: string, destPath: string) {
    try {
      const command = getProvider().cp(sourcePath, destPath) as string;
      return this.execCommand(command);
    } catch (error) {
      return error;
    }
  }
}
