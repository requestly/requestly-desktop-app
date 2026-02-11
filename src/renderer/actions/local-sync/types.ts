/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
import { Static } from "@sinclair/typebox";
import {
  Auth,
  EnvironmentVariableType,
  ApiEntryType,
  ApiRequest,
} from "./schemas";
import { type FsService } from "./fs/fs.service";

export enum FileTypeEnum {
  API = "api",
  ENVIRONMENT = "environment",
  COLLECTION_VARIABLES = "collection_variables",
  DESCRIPTION = "description",
  AUTH = "auth",
  GLOBAL_CONFIG = "global_config",
  UNKNOWN = "unknown",
}

export enum ErrorCode {
  WrongInput = "wrong_input",
  PermissionDenied = "permission_denied",
  NotPermitted = "not_permitted",
  MigrationFailed = "migration_failed",
  EntityAlreadyExists = "entity_already_exists",
  WorkspacePathAlreadyInUse = "workspace_path_already_in_use",
  NotFound = "not_found",
  UNKNOWN = "unknown",
}

export type FileSystemError = {
  type: "error";
  error: {
    message: string;
    path: string;
    fileType: FileTypeEnum;
    code: ErrorCode;
    metadata?: Record<string, any>;
  };
};

export type ContentfulSuccess<T> = T extends void
  ? { type: "success" }
  : { type: "success"; content: T };

export type FileSystemResult<T> = ContentfulSuccess<T> | FileSystemError;

export type ContentParseError = { message: string };

export type ContentParseResult<T> =
  | ContentfulSuccess<T>
  | {
    type: "error";
    error: ContentParseError;
  };

export type FolderResource = {
  type: "folder";
  path: string;
} & { readonly __tag: unique symbol };

export type FileResource = {
  type: "file";
  path: string;
} & { readonly __tag: unique symbol };

export type FsResource = FolderResource | FileResource;

export type Collection = {
  type: "collection";
  collectionId?: string;
  id: string;
  name: string;
  variables?: Record<string, any>;
  description?: string;
  auth?: Static<typeof Auth>;
};

export type API = {
  type: "api";
  collectionId?: string;
  id: string;
  data: {
    name: string;
    rank?: string;
    request: Static<typeof ApiRequest>;
  };
};

type VariableValueType = string | number | boolean;

export type EnvironmentVariableValue = {
  localValue?: VariableValueType;
  syncValue?: VariableValueType;
  type: EnvironmentVariableType;
  id: number | string;
};

type Variable = Record<
  string,
  {
    id: number | string;
    value: VariableValueType;
    type: EnvironmentVariableType;
    isSecret: boolean;
  }
>;

export type Environment = {
  type: "environment";
  id: string;
  name: string;
  isGlobal: boolean;
  variables?: Variable;
};

export type APIEntity = Collection | API | Environment;

export type CollectionRecord = {
  type: "collection";
  name: string;
  description?: string;
  collectionId: string;
  data: {
    auth: Static<typeof Auth>;
    variables: Variable;
    scripts?: {
      preRequest: string;
      postResponse: string;
    };
  };
};

export type ErroredRecord = {
  name: string;
  path: string;
  error: string;
  type: FileTypeEnum;
};

export type AnyRecord = Record<any, any>;

export interface FsCommandProvider {
  writeFile: (...params: Parameters<typeof FsService.writeFile>) => string;
  unlink: (...params: Parameters<typeof FsService.unlink>) => string;
  mkdir: (...params: Parameters<typeof FsService.mkdir>) => string;
  rmdir: (...params: Parameters<typeof FsService.rmdir>) => string;
  rename: (...params: Parameters<typeof FsService.rename>) => string;
  cp: (...params: Parameters<typeof FsService.cp>) => string;
  readFile: (...params: Parameters<typeof FsService.readFile>) => string;
}

export type UnwrappedPromise<T> = T extends Promise<infer R> ? R : T;
