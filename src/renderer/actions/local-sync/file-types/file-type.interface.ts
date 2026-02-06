import { Static, TSchema } from "@sinclair/typebox";
import { ContentParseResult, FileTypeEnum } from "../types";

export abstract class FileType<V extends TSchema> {
  abstract type: FileTypeEnum;

  abstract validator: V;

  abstract parse(content: string): ContentParseResult<Static<V>>;
}
