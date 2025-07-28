// UTILS
import { delay } from "../utils/misc";
// Sentry
import * as Sentry from "@sentry/browser";

const shutdownHandlers = [];

export function registerShutdownHandler() {
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export function addShutdownHandler(handler) {
  shutdownHandlers.push(handler);
}

export const shutdown = async () => {
  console.log("Shutting down...");
  const shutdownPromises = Promise.all(
    shutdownHandlers.map(async (handler) => {
      try {
        await handler();
      } catch (e) {
        Sentry.captureException(e);
        console.log(e);
      }
    })
  );

  await Promise.race([
    shutdownPromises,
    delay(2000), // After 2 seconds, we just close anyway, we're done.
  ]);
  // process.exit(0);
};
