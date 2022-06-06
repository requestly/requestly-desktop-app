import * as Sentry from "@sentry/browser";

export const delay = (durationMs) => {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
};

export const waitUntil = async (delayMs, tries, test) => {
  let result = tries > 0 && (await test());
  while (tries > 0 && !result) {
    tries = tries - 1;
    await delay(delayMs);
    result = await test();
  }
  if (!result) throw new Error(`Wait loop failed`);
  else return result;
};

export const getDeferred = () => {
  let resolve = undefined;
  let reject = undefined;
  let promise = new Promise((resolveCb, rejectCb) => {
    resolve = resolveCb;
    reject = rejectCb;
  });
  // TS thinks we're using these before they're assigned, which is why
  // we need the undefined types, and the any here.
  return { resolve, reject, promise };
};

// Wait for a promise, falling back to defaultValue on error or timeout
export const returnWithFallback = (promise, timeoutMs, fallbackValue) =>
  Promise.race([
    promise.catch((err) => {
      Sentry.captureException(err);
      console.error(err.message);
      return fallbackValue;
    }),
    delay(timeoutMs).then(() => fallbackValue),
  ]);
