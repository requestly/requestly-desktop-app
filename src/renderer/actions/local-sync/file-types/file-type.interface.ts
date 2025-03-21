import { Static, TSchema } from "@sinclair/typebox";
import { ContentParseResult, FileTypeEnum } from "../types";

export abstract class FileType<V extends TSchema> {
  abstract type: FileTypeEnum;

  abstract validator: V;

  // eslint-disable-next-line no-unused-vars
  abstract parse(content: string): ContentParseResult<Static<V>>;
}
