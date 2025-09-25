/*
  Electron-Builder afterPack hook to verify Windows DLL signatures and stage
  only validly signed DLLs into a dedicated folder inside resources.

  This runs during packaging. On non-Windows hosts/targets it safely no-ops.
*/

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
module.exports = async function afterPackVerifyDlls(context) {
  try {
    // Only run for Windows builds
    if (context.electronPlatformName !== "win32") {
      return;
    }

    const resourcesDir = path.join(context.appOutDir, "resources");
    const stagedDllsDir = path.join(resourcesDir, "win-dlls");

    if (!fs.existsSync(stagedDllsDir)) {
      fs.mkdirSync(stagedDllsDir, { recursive: true });
    }

    // Source folders to scan for DLLs
    const sourceDirs = [
      path.join(resourcesDir, "app.asar.unpacked"), // DLLs from asarUnpack
      path.join(resourcesDir, "static", "nss", "win32"), // DLLs from repo static folder
    ];

    for (const dir of sourceDirs) {
      if (!fs.existsSync(dir)) continue;

      const entries = fs.readdirSync(dir);
      const dllFiles = entries.filter((f) => f.toLowerCase().endsWith(".dll"));

      for (const dll of dllFiles) {
        const dllPath = path.join(dir, dll);
        const isValid = verifySignatureWindows(dllPath);

        if (isValid) {
          const destPath = path.join(stagedDllsDir, dll);
          fs.copyFileSync(dllPath, destPath);
        }
      }
    }

    // Optional: Remove original DLLs to prevent accidental loading
    for (const dir of sourceDirs) {
      if (!fs.existsSync(dir)) continue;

      const entries = fs.readdirSync(dir);
      for (const f of entries.filter((f) => f.toLowerCase().endsWith(".dll"))) {
        fs.rmSync(path.join(dir, f), { force: true });
      }
    }

    console.log("Windows DLLs staged to win-dlls folder successfully.");
  } catch (err) {
    console.warn(
      "afterPack-verify-dlls error:",
      err && err.message ? err.message : err
    );
  }
};

/**
 * Verify Authenticode signature of a DLL using PowerShell
 * Returns true if valid, false otherwise
 */
function verifySignatureWindows(filePath) {
  try {
    const psScript = `(Get-AuthenticodeSignature -FilePath \"${filePath
      .replace(/\\/g, "/")
      .replace(/"/g, '\\"')}\").Status -eq 'Valid'`;

    const result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        psScript,
      ],
      { encoding: "utf8" }
    );

    if (result.error) return false;

    const output = `${result.stdout}\n${result.stderr}`.toLowerCase();
    return output.includes("true");
  } catch (_e) {
    return false;
  }
}
