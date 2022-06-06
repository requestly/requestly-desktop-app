import * as ensureCommandExists from "command-exists";
import * as Sentry from "@sentry/browser";

export const commandExists = (path) =>
  ensureCommandExists(path)
    .then(() => true)
    .catch((error) => {
      Sentry.captureException(error);
      return false;
    });
