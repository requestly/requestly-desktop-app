import { Static, TObject } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { ContentParseResult, FsResource } from "./types";

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
}

export function parseRawJson<T extends TObject>(
  json: Record<any, any>,
  validator: T
): ContentParseResult<Static<T>> {
  try {
    const parsedContent = Value.Parse(
      ["Assert"],
      validator,
      json
    ) as Static<T>;
    return {
      type: "success",
      content: parsedContent,
    } as ContentParseResult<Static<T>>; // Casting because TS was not able to infer from fn result type
  } catch {
    const error = [...Value.Errors(validator, json)][0];
    return {
      type: "error",
      error: {
        message: `Validation error at ${error.path}: ${error.message}`,
      },
    };
  }
}

export function parseContent<T extends TObject>(
  content: string,
  validator: T
): ContentParseResult<Static<T>> {
  try {
    const parsedJson = JSON.parse(content);
    return parseRawJson(parsedJson, validator);
  } catch (e: any) {
    return {
      type: "error",
      error: {
        message: e.message || "An unexpected error has occured!",
      },
    };
  }
}
