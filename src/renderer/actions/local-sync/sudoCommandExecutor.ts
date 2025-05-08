import { FsUnix } from "./fs-unix";
import { type FsService } from "./fs/fs.service";
import { FsCommandProvider } from "./types";

const sudo = require("@vscode/sudo-prompt");

const options = {
  name: "Requestly",
};

function getProvider(): FsCommandProvider {
  if (process.platform === "darwin" || process.platform === "linux") {
    return FsUnix;
  }
  throw new Error(`Unsupported platform ${process.platform}`);
}

export class SudoCommandExecutor {
  private static execCommand(command: string) {
    return new Promise<string>((resolve, reject) => {
      sudo.exec(command, options, (error: any, stdout: string) => {
        if (error) {
          console.error("DBG error rejecting:", error);
          return reject(error);
        }
        return resolve(stdout);
      });
    });
  }

  static async writeFile(
    ...params: Parameters<typeof FsService.writeFile>
  ): ReturnType<typeof FsService.writeFile> {
    const command = getProvider().writeFile(...params);
    await SudoCommandExecutor.execCommand(command);
  }

  static async unlink(
    ...params: Parameters<typeof FsService.unlink>
  ): ReturnType<typeof FsService.unlink> {
    const command = getProvider().unlink(...params);
    await SudoCommandExecutor.execCommand(command);
  }

  static async mkdir(
    ...params: Parameters<typeof FsService.mkdir>
  ): ReturnType<typeof FsService.mkdir> {
    const command = getProvider().mkdir(...params);
    return SudoCommandExecutor.execCommand(command);
  }

  static async rmdir(
    ...params: Parameters<typeof FsService.rmdir>
  ): ReturnType<typeof FsService.rmdir> {
    const command = getProvider().rmdir(...params);
    await SudoCommandExecutor.execCommand(command);
  }

  static async rename(
    ...params: Parameters<typeof FsService.rename>
  ): ReturnType<typeof FsService.rename> {
    const command = getProvider().rename(...params);
    await SudoCommandExecutor.execCommand(command);
  }

  static async cp(
    ...params: Parameters<typeof FsService.cp>
  ): ReturnType<typeof FsService.cp> {
    const command = getProvider().cp(...params);
    await SudoCommandExecutor.execCommand(command);
  }
}
