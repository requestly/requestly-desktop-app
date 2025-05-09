import { PathLike } from "node:fs";
import { type FsService } from "./fs/fs.service";
import { FileHandle } from "node:fs/promises";

function sanitizePath(rawPath: PathLike | FileHandle) {
  let path: string;

  if (rawPath instanceof Buffer || rawPath instanceof URL) {
    path = rawPath.toString();
  } else if (typeof rawPath === "string") {
    path = rawPath;
  } else {
    throw new Error("unsupported path type");
  }

  return path
    .replace(/[\\'":$*?&|;<>`]/g, "") // Remove all special characters
    .replace(/\s+/g, ""); // Remove all whitespace
}

/*
@TODO: This needs to consume string | NodeJS.ArrayBufferView | Iterable<string | NodeJS.ArrayBufferView> | AsyncIterable<string | NodeJS.ArrayBufferView> | internal.Stream
 and convert it into string that can be used in a shell command 
 */

export class FsUnix {
  static writeFile(...params: Parameters<typeof FsService.writeFile>): string {
    const path = sanitizePath(params[0]);
    return `echo '${params[1]}' > ${path}`;
  }

  static unlink(...params: Parameters<typeof FsService.unlink>): string {
    const path = sanitizePath(params[0]);
    return `rm -f ${path}`;
  }

  static mkdir(...params: Parameters<typeof FsService.mkdir>): string {
    const path = sanitizePath(params[0]);
    return `mkdir -p ${path}`;
  }

  static rmdir(...params: Parameters<typeof FsService.rmdir>): string {
    const path = sanitizePath(params[0]);
    return `rm -rf ${path}`;
  }

  static rename(...params: Parameters<typeof FsService.rename>): string {
    const source = sanitizePath(params[0]);
    const destination = sanitizePath(params[1]);
    return `mv ${source} ${destination}`;
  }

  static cp(...params: Parameters<typeof FsService.cp>): string {
    const path = sanitizePath(params[0]);
    return `cp -r ${path} ${params[1]}`;
  }
}
