import { TSchema } from "@sinclair/typebox";
import { FileTypeEnum } from "../types";

export abstract class FileType<V extends TSchema> {
  abstract type: FileTypeEnum;

  abstract validator: V;
}
