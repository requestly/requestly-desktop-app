import { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { ContentParseResult, FileSystemResult, FsResource } from "./types";

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
  return path;
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
export function isThenable(wat: any): wat is Promise<any> {
  // eslint-disable-next-line
  return Boolean(wat?.then && typeof wat.then === "function");
}
