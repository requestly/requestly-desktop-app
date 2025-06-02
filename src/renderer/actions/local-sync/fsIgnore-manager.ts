import ignore from "ignore";
import {
  appendPath,
  getNormalizedPath,
  parseJsonContent,
} from "./common-utils";
import { CONFIG_FILE } from "./constants";
import { readFileSync } from "./fs-utils";
import { Config } from "./schemas";

export class FsIgnoreManager {
  private rootPath: string;

  private ig: ReturnType<typeof ignore>;

  constructor(rootpath: string) {
    this.rootPath = getNormalizedPath(rootpath);
    this.ig = ignore();
    this.loadFsIgnore();
  }

  private loadFsIgnore() {
    try {
      const configFilePath = appendPath(this.rootPath, CONFIG_FILE);
      const readResult = readFileSync(configFilePath);
      if (readResult.type === "success") {
        const configResult = parseJsonContent(readResult.content, Config);
        if (configResult.type === "success") {
          this.ig.add(configResult.content.exclude || []);
        }
      }
    } catch (e: any) {
      throw new Error(`Error reading config file: ${e.message}`);
    }
  }

  public checkShouldIgnore(path: string): boolean {
    // Convert absolute path to relative path
    const relativePath = path.replace(this.rootPath, "");
    return this.ig.ignores(relativePath);
  }
}
