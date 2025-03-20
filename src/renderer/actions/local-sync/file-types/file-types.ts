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
import { parseJsonContent, parseRaw } from "../common-utils";

export class ApiRecordFileType extends FileType<typeof ApiRecord> {
  validator = ApiRecord;

  type = FileTypeEnum.API;

  parse(content: string) {
    return parseJsonContent(content, this.validator);
  }
}

export class EnvironmentRecordFileType extends FileType<
  typeof EnvironmentRecord
> {
  validator = EnvironmentRecord;

  type = FileTypeEnum.ENVIRONMENT;

  parse(content: string) {
    return parseJsonContent(content, this.validator);
  }
}

export class CollectionVariablesRecordFileType extends FileType<
  typeof Variables
> {
  validator = Variables;

  type = FileTypeEnum.COLLECTION_VARIABLES;

  parse(content: string) {
    return parseJsonContent(content, this.validator);
  }
}

export class ReadmeRecordFileType extends FileType<typeof Description> {
  validator = Description;

  type = FileTypeEnum.DESCRIPTION;

  parse(content: string) {
    return parseRaw(content, this.validator);
  }
}

export class AuthRecordFileType extends FileType<typeof Auth> {
  validator = Auth;

  type = FileTypeEnum.AUTH;

  parse(content: string) {
    return parseJsonContent(content, this.validator);
  }
}

export class GlobalConfigRecordFileType extends FileType<typeof GlobalConfig> {
  validator = GlobalConfig;

  type = FileTypeEnum.GLOBAL_CONFIG;

  parse(content: string) {
    return parseJsonContent(content, this.validator);
  }
}

export function parseFileType(type: string) {
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
    default:
      throw new Error(`${type} is an invalid file type`);
  }
}
