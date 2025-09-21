import { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import {
  ContentParseResult,
  ErrorCode,
  FileSystemError,
  FileSystemResult,
  FileTypeEnum,
  FsResource,
} from "./types";
import { fileIndex } from "./file-index";

export class FsResourceCreationError extends Error {
  path: string;

  constructor(path: string, message: string) {
    super(message);
    this.path = path;
  }
}

export function getNormalizedPath(path: string) {
  const normalizedPath = path.endsWith("/") ? path : `${path}/`;
  return normalizedPath;
}

export function appendPath(basePath: string, resourcePath: string) {
  const separator = basePath.endsWith("/") ? "" : "/";
  return `${basePath}${separator}${resourcePath}`;
}

export function createFsResource<T extends FsResource["type"]>(params: {
  rootPath: string;
  path: string;
  type: T;
}): FsResource & { type: T } {
  try {
    const { rootPath, type } = params;
    let { path } = params;

    if (type === "folder") {
      path = getNormalizedPath(path);
    }

    if (!path.length) {
      throw new Error(
        `Can not create fs resource reference! Path '${path}' is malformed.`
      );
    }

    const normalizedRootPath = getNormalizedPath(rootPath);
    const pathRootSlice = path.slice(0, normalizedRootPath.length);

    if (normalizedRootPath !== pathRootSlice) {
      throw new Error(
        `Can not create fs resource reference! Path '${path}' lies outside workspace path '${rootPath}'`
      );
    }

    if (type === "file") {
      const parts = path.split("/");
      const endPart = parts.at(parts.length - 1);
      if (!endPart) {
        throw new Error(
          `Can not create file reference! Path '${path}' is malformed.`
        );
      }

      return {
        path,
        type,
      } as FsResource & { type: T };
    }

    const normalizedFolderPath = getNormalizedPath(path);
    return {
      path: normalizedFolderPath,
      type,
    } as FsResource & { type: T };
  } catch (e: any) {
    throw new FsResourceCreationError(params.path, e.message);
  }
}

export function parseRaw<T extends TSchema>(
  content: any,
  validator: T
): ContentParseResult<Static<T>> {
  try {
    const parsedContent = Value.Parse(
      ["Assert"],
      validator,
      content
    ) as Static<T>;
    return {
      type: "success",
      content: parsedContent,
    } as ContentParseResult<Static<T>>; // Casting because TS was not able to infer from fn result type
  } catch {
    const error = [...Value.Errors(validator, content)][0];
    return {
      type: "error",
      error: {
        message: `Validation error at ${error.path}: ${error.message}`,
      },
    };
  }
}

export function parseJsonContent<T extends TSchema>(
  content: string,
  validator: T
): ContentParseResult<Static<T>> {
  try {
    const parsedJson = JSON.parse(content);
    return parseRaw(parsedJson, validator);
  } catch (e: any) {
    return {
      type: "error",
      error: {
        message: e.message || "An unexpected error has occured!",
      },
    };
  }
}

export function getIdFromPath(path: string) {
  const id = fileIndex.getId(path);
  return id;
}

export function mapSuccessWrite<
  T extends FileSystemResult<{ resource: FsResource }>,
  R extends FileSystemResult<any>
  // eslint-disable-next-line no-unused-vars
>(writeResult: T, fn: (id: string) => R) {
  if (writeResult.type === "success") {
    const { resource } = writeResult.content;
    const id = getIdFromPath(resource.path);
    return fn(id);
  }

  // If writeResult is not success, then we simply need to bubble up the error.
  // To do that along with keeping the return type consistent, we manually cast here.
  // This cast is safe since it's error response we are dealing with.
  return writeResult as unknown as R & { type: "error" };
}

export function mapSuccessfulFsResult<
  Content,
  T extends FileSystemResult<Content>,
  R
  // eslint-disable-next-line no-unused-vars
>(result: T, fn: (param: T & { type: "success" }) => R) {
  if (result.type === "success") {
    const newContent = fn(result as T & { type: "success" });
    const returnResult = {
      type: "success",
      content: newContent,
    } as FileSystemResult<R>;
    return returnResult;
  }

  // If writeResult is not success, then we simply need to bubble up the error.
  // To do that along with keeping the return type consistent, we manually cast here.
  // This cast is safe since it's error response we are dealing with.
  return result as unknown as FileSystemResult<R>;
}

export function getNameOfResource(fsResource: FsResource) {
  const parts = fsResource.path.split("/");
  if (fsResource.type === "folder") {
    const endPart = parts[parts.length - 2];
    return endPart;
  }
  const endPart = parts[parts.length - 1];
  return endPart;
}

export function removeUndefinedFromRoot(
  record: Record<any, Object | undefined>
) {
  const keys = Object.keys(record);
  keys.forEach((key) => {
    if (record[key] === undefined) {
      delete record[key];
    }
  });
}

/**
 * Checks whether given value has a then function.
 * @param wat A value to be checked.
 */
export function isThenable<T = any>(wat: any): wat is Promise<T> {
  // eslint-disable-next-line
  return Boolean(wat?.then && typeof wat.then === "function");
}

export function isAccessError(error: any) {
  return error.code === "EACCES";
}

export function createFileSystemError(
  error: { message: string },
  path: string,
  fileType: FileTypeEnum
): FileSystemError {
  const errorCode = isAccessError(error)
    ? ErrorCode.PermissionDenied
    : ErrorCode.UNKNOWN;
  return {
    type: "error",
    error: {
      code: errorCode,
      message: error.message || "An unexpected error has occurred!",
      path,
      fileType,
    },
  };
}

/**
 * WARNING: Genrated by Claude
 *
 * Sanitizes a string to be safe for use as a filename or folder name across all platforms
 * (Windows, macOS, Linux)
 * 
 * @param input - The input string to sanitize
 * @param maxLength - Maximum length for the filename (default: 100)
 * @param replacement - Character to replace invalid characters with (default: '_')
 * @returns A sanitized filename safe for all platforms
 */
export function sanitizeFsResourceName(
  input: string, 
  maxLength: number = 100, 
  replacement: string = '_'
): string {
  if (!input || typeof input !== 'string') {
    return 'Untitled';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // If empty after trim, return default
  if (!sanitized) {
    return 'Untitled';
  }

  // Reserved names on Windows (case-insensitive)
  const reservedNames = new Set([
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ]);

  // Characters that are invalid in filenames across platforms
  // Windows: < > : " | ? * \ /
  // macOS: : (converted to /) 
  // Linux: / and null character
  // We'll be conservative and exclude all problematic characters
  const invalidCharsRegex = /[<>:"/\\|?*\x00-\x1F\x7F]/g;

  // Replace invalid characters
  sanitized = sanitized.replace(invalidCharsRegex, replacement);

  // Remove or replace problematic characters at start/end
  // Can't start or end with spaces or dots on Windows
  sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, replacement);

  // Handle multiple consecutive replacement characters
  if (replacement) {
    const replacementRegex = new RegExp(`${escapeRegex(replacement)}+`, 'g');
    sanitized = sanitized.replace(replacementRegex, replacement);
  }

  // Check if it's a reserved name (Windows)
  const nameWithoutExt = sanitized.split('.')[0].toUpperCase();
  if (reservedNames.has(nameWithoutExt)) {
    sanitized = `${replacement}${sanitized}`;
  }

  // Ensure it doesn't start with a dash (can cause issues with command line tools)
  if (sanitized.startsWith('-')) {
    sanitized = replacement + sanitized.slice(1);
  }

  // Limit length while preserving file extension if present
  if (sanitized.length > maxLength) {
    const lastDotIndex = sanitized.lastIndexOf('.');
    if (lastDotIndex > 0 && lastDotIndex > sanitized.length - 10) {
      // Has extension, preserve it
      const extension = sanitized.slice(lastDotIndex);
      const nameOnly = sanitized.slice(0, lastDotIndex);
      const maxNameLength = maxLength - extension.length;
      sanitized = nameOnly.slice(0, maxNameLength) + extension;
    } else {
      // No extension or extension is too far back
      sanitized = sanitized.slice(0, maxLength);
    }
  }

  // Final cleanup - remove trailing dots and spaces again (in case truncation caused issues)
  sanitized = sanitized.replace(/[.\s]+$/, '');

  // If we ended up with an empty string, return default
  if (!sanitized) {
    return 'Untitled';
  }

  return sanitized;
}

/**
 * Helper function to escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
