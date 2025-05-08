import fs from "node:fs";
import fsp from "node:fs/promises";

export class FsService {

  static readFileSync(...params: Parameters<typeof fs.readFileSync>) {
    return fs.readFileSync(...params);
  }

  static readdir(...params: Parameters<typeof fsp.readdir>) {
    return fsp.readdir(...params);
  }

  static stat(...params: Parameters<typeof fsp.stat>) {
    return fsp.stat(...params);
  }
}
