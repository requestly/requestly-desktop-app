import * as adb from "@devicefarmer/adbkit";
import { getCertificateFingerprint, parseCert } from "renderer/utils/cert";
import stream from "stream";

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
    throw new Error(error?.message);
  }
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
    const certPath = `/data/misc/user/0/cacerts-added/${certHash}.0`;
    const certStream = await adbClient.getDevice(deviceId).pull(certPath);

    // Wait until it's clear that the read is successful
    const data = await new Promise<Buffer>((resolve, reject) => {
      // eslint-disable-next-line no-shadow
      const data: Buffer[] = [];
      certStream.on("data", (d: Buffer) => data.push(d));
      certStream.on("end", () => resolve(Buffer.concat(data)));

      certStream.on("error", reject);
    });

    console.log("Read data", { data: data.toString("utf8") });
    // The device already has an cert. But is it the right one?
    const existingCert = parseCert(data.toString("utf8"));
    const existingFingerprint = getCertificateFingerprint(existingCert);
    console.log({
      certHash,
      data: data.toString("utf8"),
      certFingerprint,
      existingFingerprint,
    });
    return certFingerprint === existingFingerprint;
  } catch (e) {
    // Couldn't read the cert, or some other error - either way, we probably
    // don't have a working system cert installed.
    console.log("Error reading cert", e);
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

export const checkProxy = async (adbClient: adb.Client, deviceId: string) => {
  return adbClient
    .getDevice(deviceId)
    .shell("settings get global http_proxy")
    .then(adb.Adb.util.readAll)
    .then((output: any) => {
      return output.toString().trim();
    })
    .catch((err: any) => {
      console.log("checkProxy", err);
    });
};
