import ignore from "ignore";
import { getNormalizedPath } from "./common-utils";
import { Config } from "./schemas";
import { Static } from "@sinclair/typebox";

export class FsIgnoreManager {
  private rootPath: string;

  private ig: ReturnType<typeof ignore>;

  private exclude: string[] = [];

  constructor(rootpath: string, config: Static<typeof Config>) {
    this.rootPath = getNormalizedPath(rootpath);
    this.ig = ignore();
    this.loadFsIgnore(config);
  }

  private loadFsIgnore(config: Static<typeof Config>) {
    try {
      this.exclude = config.exclude || [];
      this.ig.add(this.exclude);
    } catch (e: any) {
      throw new Error(`Error reading config file: ${e.message}`);
    }
  }

  public checkShouldIgnore(path: string): boolean {
    // Convert absolute path to relative path
    const relativePath = path.replace(this.rootPath, "");
    const isIgnored = this.ig.ignores(relativePath);
    return isIgnored;
  }
}
