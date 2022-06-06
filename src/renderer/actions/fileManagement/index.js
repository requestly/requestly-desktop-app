const { promisify } = require("es6-promisify");
import * as fs from "fs";
import * as tmp from "tmp";
import * as rimraf from "rimraf";
import * as Sentry from "@sentry/browser";

const rmfr = require("rmfr");

export const statFile = promisify(fs.stat);
export const readFile = promisify(fs.readFile);
export const readDir = promisify(fs.readdir);
export const deleteFile = promisify(fs.unlink);
export const checkAccess = promisify(fs.access);
export const mkDir = promisify(fs.mkdir);
export const writeFile = promisify(fs.writeFile);
export const renameFile = promisify(fs.rename);
export const copyFile = promisify(fs.copyFile);

export const canAccess = (path) =>
  checkAccess(path)
    .then(() => true)
    .catch((error) => {
      Sentry.captureException(error);
      return false;
    });

export const deleteFolder = rmfr;

export const ensureDirectoryExists = (path) =>
  checkAccess(path).catch((error) => {
    Sentry.captureException(error);
    return mkDir(path, { recursive: true });
  });

export const moveFile = async (oldPath, newPath) => {
  try {
    await renameFile(oldPath, newPath);
  } catch (e) {
    Sentry.captureException(e);
    if (e.code === "EXDEV") {
      // Cross-device - can't rename files across partions etc.
      // In that case, we fallback to copy then delete:
      await copyFile(oldPath, newPath);
      await deleteFile(oldPath);
    }
  }
};

export const createTmp = (options = {}) =>
  new Promise((resolve, reject) => {
    tmp.file(options, (err, path, fd, cleanupCallback) => {
      if (err) return reject(err);
      resolve({ path, fd, cleanupCallback });
    });
  });
