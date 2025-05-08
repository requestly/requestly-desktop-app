import { type FsService } from "./fs/fs.service";

export class FsUnix {
  static writeFile(...params: Parameters<typeof FsService.writeFile>): string {
    return `echo "${params[1]}" > "${params[0]}"`;
  }

  static unlink(...params: Parameters<typeof FsService.unlink>): string {
    return `rm -f "${params[0]}"`;
  }

  static mkdir(...params: Parameters<typeof FsService.mkdir>): string {
    return `mkdir -p "${params[0]}"`;
  }

  static rmdir(...params: Parameters<typeof FsService.rmdir>): string {
    return `rm -rf "${params[0]}"`;
  }

  static rename(...params: Parameters<typeof FsService.rename>): string {
    return `mv "${params[0]}" "${params[1]}"`;
  }

  static cp(...params: Parameters<typeof FsService.cp>): string {
    return `cp -r ${JSON.stringify(params[0])} ${JSON.stringify(params[1])}`;
  }
}
