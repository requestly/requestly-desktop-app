import Adb from "@devicefarmer/adbkit";

export const getAvailableAndroidDevices = async () => {
  const adbClient = Adb.createClient();
  const devices = await adbClient.listDevicesWithPaths();
  console.log("Available Android Devices", { devices });
  return devices;
};

export const getAvailableIOSDevices = () => {};

export function delay(durationMs: number): Promise<void> {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

export async function waitUntil<T extends unknown>(
  delayMs: number,
  tries: number,
  test: () => Promise<T>
): Promise<Exclude<T, false>> {
  let result = tries > 0 && (await test());

  while (tries > 0 && !result) {
    // eslint-disable-next-line no-param-reassign
    tries -= 1;
    await delay(delayMs);
    result = await test();
  }

  if (!result) throw new Error(`Wait loop failed`);
  else return result as Exclude<T, false>;
}
