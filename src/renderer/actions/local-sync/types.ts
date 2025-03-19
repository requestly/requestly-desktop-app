/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
import { Static } from "@sinclair/typebox";
import { Auth, EnvironmentVariableType } from "./schemas";

export enum FileTypeEnum {
  API = "api",
  ENVIRONMENT = "environment",
  COLLECTION_VARIABLES = "collection_variables",
  DESCRIPTION = "description",
  AUTH = "auth",
  GLOBAL_CONFIG = "global_config",
  UNKNOWN = "unknown",
}

export type FileSystemError = {
  message: string;
  path: string;
  fileType: FileTypeEnum;
};
export type ContentfulSuccess<T> = T extends void
  ? { type: "success" }
  : { type: "success"; content: T };
export type FileSystemResult<T> =
  | ContentfulSuccess<T>
  | {
      type: "error";
      error: FileSystemError;
    };
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
  request: {
    name: string;
    url: string;
    method: string;
  };
};

type VariableValueType = string | number | boolean;

export type EnvironmentVariableValue = {
  localValue?: VariableValueType;
  syncValue?: VariableValueType;
  type: EnvironmentVariableType;
  id: number;
};

type Variable = Record<
  string,
  {
    id: number;
    value: VariableValueType;
    type: EnvironmentVariableType;
    isSecret: boolean;
  }
>;

export type Environment = {
  type: "environment";
  id: string;
  name: string;
  variables?: Variable;
};

export type APIEntity = Collection | API | Environment;

export type ErroredRecords = {
  name: string;
  path: string;
  error: string;
  type: FileTypeEnum;
};
