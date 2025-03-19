/* eslint-disable max-classes-per-file */

import { FileType } from "./file-type.interface";
import {
  ApiRecord,
  Auth,
  Description,
  EnvironmentRecord,
  GlobalConfig,
  Variables,
} from "../schemas";
import { FileTypeEnum } from "../types";
import { TUnknown, Type } from "@sinclair/typebox";

export class ApiRecordFileType extends FileType<typeof ApiRecord> {
  validator = ApiRecord;

  type = FileTypeEnum.API;
}

export class EnvironmentRecordFileType extends FileType<
  typeof EnvironmentRecord
> {
  validator = EnvironmentRecord;

  type = FileTypeEnum.ENVIRONMENT;
}

export class CollectionVariablesRecordFileType extends FileType<
  typeof Variables
> {
  validator = Variables;

  type = FileTypeEnum.COLLECTION_VARIABLES;
}

export class ReadmeRecordFileType extends FileType<typeof Description> {
  validator = Description;

  type = FileTypeEnum.DESCRIPTION;
}

export class AuthRecordFileType extends FileType<typeof Auth> {
  validator = Auth;

  type = FileTypeEnum.AUTH;
}

export class GlobalConfigRecordFileType extends FileType<typeof GlobalConfig> {
  validator = GlobalConfig;

  type = FileTypeEnum.GLOBAL_CONFIG;
}

export class UnknownFileType extends FileType<TUnknown> {
  validator = Type.Unknown();

  type = FileTypeEnum.UNKNOWN;
}

export function parseFileType(type: string): FileType<any> {
  switch (type) {
    case FileTypeEnum.API:
      return new ApiRecordFileType();
    case FileTypeEnum.ENVIRONMENT:
      return new EnvironmentRecordFileType();
    case FileTypeEnum.COLLECTION_VARIABLES:
      return new CollectionVariablesRecordFileType();
    case FileTypeEnum.DESCRIPTION:
      return new ReadmeRecordFileType();
    case FileTypeEnum.AUTH:
      return new AuthRecordFileType();
    case FileTypeEnum.GLOBAL_CONFIG:
      return new GlobalConfigRecordFileType();
    case FileTypeEnum.UNKNOWN:
      return new UnknownFileType();
    default:
      throw new Error("Invalid file type!");
  }
}
