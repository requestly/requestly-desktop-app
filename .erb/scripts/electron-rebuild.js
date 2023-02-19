import { execSync } from "child_process";
import fs, {readdirSync} from "fs";
import { dependencies } from "../../release/app/package.json";
import webpackPaths from "../configs/webpack.paths";

const getModules = (source, exclude) =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !exclude.includes(dirent.name))
    .map(dirent => dirent.name);

if (
  Object.keys(dependencies || {}).length > 0 &&
  fs.existsSync(webpackPaths.appNodeModulesPath)
) {
    // Skip modules that are already prebuilt
    const exclude = ['win-version-info'];
    const modules = getModules(webpackPaths.appNodeModulesPath, exclude);

    const electronRebuildCmd = `../../node_modules/.bin/electron-rebuild --parallel --types prod,dev,optional --only ${modules.toString()} --module-dir .`;
  const cmd =
    process.platform === "win32"
      ? electronRebuildCmd.replace(/\//g, "\\")
      : electronRebuildCmd;
  execSync(cmd, {
    cwd: webpackPaths.appPath,
    stdio: "inherit",
  });
}
