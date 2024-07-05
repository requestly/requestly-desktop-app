// import Adb from "@devicefarmer/adbkit";
import * as adb from "@devicefarmer/adbkit";
import { getCertificateFingerprint, parseCert } from "renderer/utils/cert";
import stream from "stream";
import { delay, waitUntil } from "./utils";
// import { delay, waitUntil } from "./utils";

// async function run(
//   adbClient: adb.Client,
//   deviceId: string,
//   command: string[],
//   options: {
//     timeout?: number;
//   } = {
//     timeout: 10000,
//   }
// ): Promise<string> {
//   return Promise.race([
//     adbClient
//       .getDevice(deviceId)
//       .shell(command)
//       .then(Adb.util.readAll)
//       .then((buffer: any) => buffer.toString("utf8")),
//     ...(options.timeout
//       ? [
//           delay(options.timeout).then(() => {
//             throw new Error(`Timeout for ADB command ${command}`);
//           }),
//         ]
//       : []),
//   ]);
// }

export const ANDROID_TEMP = "/data/local/tmp";
export const SYSTEM_CA_PATH = "/system/etc/security/cacerts";

async function run(
  adbClient: adb.Client,
  deviceId: string,
  command: string[],
  options: {
    timeout?: number;
  } = {
    timeout: 10000,
  }
): Promise<string> {
  return Promise.race([
    adbClient
      .getDevice(deviceId)
      .shell(command)
      .then(adb.Adb.util.readAll)
      .then((buffer: any) => buffer.toString("utf8")),
    ...(options.timeout
      ? [
          delay(options.timeout).then(() => {
            throw new Error(`Timeout for ADB command ${command}`);
          }),
        ]
      : []),
  ]);
}

export async function rootDevice(
  adbClient: adb.Client,
  deviceId: string
): Promise<boolean | undefined> {
  try {
    const output = await adbClient.getDevice(deviceId).root();
    console.log("Root Device", { output });
    return output;
  } catch (error: any) {
    if (error.message === "adbd is already running as root") {
      console.log("Device is already rooted");
      return true;
    }

    console.error(error);
    return false;
  }
}

const runAsRootCommands = [
  ["su", "root"], // Used on official emulators
  ["su", "-c"], // Normal root
];

export async function getRootCommand(
  adbClient: adb.Client,
  deviceId: string
): Promise<string[] | undefined> {
  // Run whoami with each of the possible root commands
  const rootCheckResults = await Promise.all(
    runAsRootCommands.map((cmd) =>
      run(adbClient, deviceId, cmd.concat("whoami"), { timeout: 1000 })
        .catch(console.log)
        .then((whoami) => ({ cmd, whoami }))
    )
  );

  // Filter to just commands that successfully printed 'root'
  const validRootCommands = rootCheckResults
    .filter((result) => (result.whoami || "").trim() === "root")
    .map((result) => result.cmd);

  if (validRootCommands.length >= 1) return validRootCommands[0];

  // If no explicit root commands are available, try to restart adb in root
  // mode instead. If this works, *all* commands will run as root.
  // We prefer explicit "su" calls if possible, to limit access & side effects.
  await adbClient
    .getDevice(deviceId)
    .root()
    .catch((e: any) => {
      if (e.message && e.message.includes("adbd is already running as root")) {
        console.log("Device is already rooted");
      } else console.log(e);
    });

  // Sometimes switching to root can disconnect ADB devices, so double-check
  // they're still here, and wait a few seconds for them to come back if not.

  await delay(500); // Wait, since they may not disconnect immediately
  const whoami = await waitUntil(250, 10, (): Promise<string | false> => {
    return run(adbClient, deviceId, ["whoami"]).catch(() => false);
  }).catch(console.log);

  return (whoami || "").trim() === "root"
    ? [] // all commands now run as root, so no prefix required.
    : undefined; // Still not root, no luck.
}

export async function pushFile(
  adbClient: adb.Client,
  deviceId: string,
  contents: string | stream.Readable,
  path: string,
  mode?: number
) {
  const transfer = await adbClient
    .getDevice(deviceId)
    .push(contents, path, mode);

  return new Promise((resolve, reject) => {
    transfer.on("end", resolve);
    transfer.on("error", reject);
  });
}

export async function hasCertInstalled(
  adbClient: adb.Client,
  deviceId: string,
  certHash: string,
  certFingerprint: string
) {
  try {
    const certPath = `/system/etc/security/cacerts/${certHash}.0`;
    const certStream = await adbClient.getDevice(deviceId).pull(certPath);

    // Wait until it's clear that the read is successful
    const data = await new Promise<Buffer>((resolve, reject) => {
      // eslint-disable-next-line no-shadow
      const data: Buffer[] = [];
      certStream.on("data", (d: Buffer) => data.push(d));
      certStream.on("end", () => resolve(Buffer.concat(data)));

      certStream.on("error", reject);
    });

    // The device already has an cert. But is it the right one?
    const existingCert = parseCert(data.toString("utf8"));
    const existingFingerprint = getCertificateFingerprint(existingCert);
    return certFingerprint === existingFingerprint;
  } catch (e) {
    // Couldn't read the cert, or some other error - either way, we probably
    // don't have a working system cert installed.
    return false;
  }
}

export function stringAsStream(input: string) {
  const contentStream = new stream.Readable();
  // eslint-disable-next-line no-underscore-dangle
  contentStream._read = () => {};
  contentStream.push(input);
  contentStream.push(null);
  return contentStream;
}

export async function injectSystemCertificate(
  adbClient: adb.Client,
  deviceId: string,
  rootCmd: string[],
  certificatePath: string
) {
  const injectionScriptPath = `${ANDROID_TEMP}/htk-inject-system-cert.sh`;

  // We have a challenge here. How do we add a new cert to /system/etc/security/cacerts,
  // when that's generally read-only & often hard to remount (emulators require startup
  // args to allow RW system files). Solution: mount a virtual temporary FS on top of it.
  await pushFile(
    adbClient,
    deviceId,
    stringAsStream(`
          set -e # Fail on error

          # Create a separate temp directory, to hold the current certificates
          # Without this, when we add the mount we can't read the current certs anymore.
          mkdir -m 700 /data/local/tmp/htk-ca-copy

          # Copy out the existing certificates
          cp /system/etc/security/cacerts/* /data/local/tmp/htk-ca-copy/

          # Create the in-memory mount on top of the system certs folder
          mount -t tmpfs tmpfs /system/etc/security/cacerts

          # Copy the existing certs back into the tmpfs mount, so we keep trusting them
          mv /data/local/tmp/htk-ca-copy/* /system/etc/security/cacerts/

          # Copy our new cert in, so we trust that too
          mv ${certificatePath} /system/etc/security/cacerts/

          # Update the perms & selinux context labels, so everything is as readable as before
          chown root:root /system/etc/security/cacerts/*
          chmod 644 /system/etc/security/cacerts/*
          chcon u:object_r:system_file:s0 /system/etc/security/cacerts/*

          # Delete the temp cert directory & this script itself
          rm -r /data/local/tmp/htk-ca-copy
          rm ${injectionScriptPath}

          echo "System cert successfully injected"
      `),
    injectionScriptPath,
    // Due to an Android bug - user mode is always duplicated to group & others. We set as read-only
    // to avoid making this writable by others before we run it as root in a moment.
    // More details: https://github.com/openstf/adbkit/issues/126
    0o444
  );

  // Actually run the script that we just pushed above, as root
  await run(adbClient, deviceId, rootCmd.concat("sh", injectionScriptPath));
}
