import { Static, TSchema } from "@sinclair/typebox";
import { Value, ValueError } from "@sinclair/typebox/value";
import {
  ContentParseResult,
  ErrorCode,
  FileSystemError,
  FileSystemResult,
  FileTypeEnum,
  FsResource,
} from "./types";
import { fileIndex } from "./file-index";
import { captureException } from "@sentry/browser";

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
  exposedWorkspacePaths?: Map<string, unknown>,
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

    const normalizedRootPaths = new Set<string>().add(getNormalizedPath(rootPath));
    params.exposedWorkspacePaths?.keys().forEach(path => normalizedRootPaths.add(getNormalizedPath(path)));
    if (!normalizedRootPaths.values().some(rootPath => path.startsWith(rootPath))) {
      throw new Error(
        `Can not create fs resource reference! Path '${path}' lies outside workspace paths!`
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

/**
 * Collects all error messages from TypeBox validation errors
 */
function collectVerboseErrors(TypeboxError: Iterable<ValueError>): string[] {
  const messages: string[] = [];

  for (const nestedError of TypeboxError) {
    messages.push(nestedError.message);
    if (nestedError.errors && nestedError.errors.length > 0) {

      nestedError.errors.forEach((subIterator) => {
        const subErrors = Array.from(subIterator);

        if (subErrors.length > 0) {
          const nestedMessages = collectVerboseErrors(subErrors);
          messages.push(...nestedMessages);
        }
      });
    }
  }

  return messages;
}

/**
 * Collects all validation errors and their messages.
 * Returns the first error as heading and remaining errors as additional context.
 */
function formatValidationErrors(validator: TSchema, content: any): {
  error: any;
  heading: string;
  additionalErrors: string[];
} {
  const allErrors = [...Value.Errors(validator, content)];
  const nestedErrorMessages = collectVerboseErrors(allErrors);
  
  return {
    error: allErrors[0],
    heading: nestedErrorMessages[0] || "Validation error",
    additionalErrors: nestedErrorMessages.slice(1),
  };
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
    const { error, heading, additionalErrors } = formatValidationErrors(validator, content);   
    captureException(heading, { extra: { additionalErrors } });
    
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

export function isNotPermitted(error: any) {
  return error.code === "EPERM";
}

export function isNotFoundError(error: any) {
  return error.code === "ENOENT";
}

export function createFileSystemError(
  error: { message: string },
  path: string,
  fileType: FileTypeEnum
): FileSystemError {
  const errorCode = isAccessError(error)
    ? ErrorCode.PermissionDenied
    : isNotPermitted(error)
    ? ErrorCode.NotPermitted
    : isNotFoundError(error)
    ? ErrorCode.NotFound
    : ErrorCode.UNKNOWN;

  captureException(error, {
    tags: {
      fileType
    }
  });
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

/**
 * Detects if a given name corresponds to a 'new' entity based on a base string pattern.
 * Matches exact base string or base string followed by a number.
 * 
 * @param name - The name to check (e.g., 'Untitled', 'Untitled1', 'Untitled42')
 * @param baseString - The base string to match against (e.g., 'Untitled', 'New Environment')
 * @returns true if the name matches the pattern, false otherwise
 */
export function isNewEntityName(name: string, baseString: string): boolean {
  // Escape special regex characters in the base string
  const escapedBase = baseString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Pattern: exact match OR base string followed by one or more digits
  const pattern = new RegExp(`^${escapedBase}(\\d+)?$`);
  
  return pattern.test(name);
}

/**
 * Pure function that generates the next available name variant.
 * Always starts with baseName + "1" and increments until finding an available name.
 * 
 * @param baseName - The base name to generate alternatives for
 * @param existingNames - Array of existing names to avoid conflicts with
 * @returns The next available name variant (e.g., 'Untitled1', 'Untitled2')
 */
export function getAlternateName(baseName: string, existingNames: Set<string>): string {
  if(!existingNames.has(baseName)) {
    return baseName;
  }
  let counter = 1;
  let candidateName = `${baseName}${counter}`;
  
  while (existingNames.has(candidateName)) {
    counter++;
    candidateName = `${baseName}${counter}`;
  }
  
  return candidateName;
}

export function getNewNameIfQuickCreate(params: {
  name: string,
  baseName: string,
  parentPath: string,
}) {
  if(!isNewEntityName(params.name, params.baseName)) {
    return params.name;
  }
  const children = fileIndex.getImmediateChildren(params.parentPath);

  return getAlternateName(params.baseName, children);
}
