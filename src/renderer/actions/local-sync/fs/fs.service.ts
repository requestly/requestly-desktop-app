/* eslint-disable */
import { Abortable } from "node:events";
import fs, {
  Mode,
  ObjectEncodingOptions,
  OpenMode,
  PathLike,
  PathOrFileDescriptor,
  StatOptions,
} from "node:fs";
import fsp, { FileHandle } from "node:fs/promises";
import { Stream } from "node:stream";
import { AccessFallback } from "./access-fallback.decorator";
import { SudoCommandExecutor } from "../sudoCommandExecutor";

export class FsService {
  static readFileSync(
    path: PathOrFileDescriptor,
    options?: {
      encoding?: null | undefined;
      flag?: string | undefined;
    } | null
  ) {
    return fs.readFileSync(path, options);
  }

  static readFile(
    path: PathLike | FileHandle,
    options?:
      | ({
          encoding?: null | undefined;
          flag?: OpenMode | undefined;
        } & Abortable)
      | null
  ) {
    return fsp.readFile(path, options);
  }

  static readdir(
    path: PathLike,
    options?:
      | (ObjectEncodingOptions & {
          withFileTypes?: false | undefined;
        })
      | BufferEncoding
      | null
  ) {
    return fsp.readdir(path, options);
  }

  static stat(
    path: PathLike,
    opts?: StatOptions & {
      bigint?: false | undefined;
    }
  ) {
    return fsp.stat(path, opts);
  }

  static lstat(
    path: PathLike,
    opts?: StatOptions & {
      bigint?: false | undefined;
    }
  ) {
    return fsp.lstat(path, opts);
  }

  static writeFile(
    file: PathLike | FileHandle,
    data:
      | string
      | NodeJS.ArrayBufferView
      | Iterable<string | NodeJS.ArrayBufferView>
      | AsyncIterable<string | NodeJS.ArrayBufferView>
      | Stream,
    options?:
      | (ObjectEncodingOptions & {
          mode?: Mode | undefined;
          flag?: OpenMode | undefined;
        } & Abortable)
      | BufferEncoding
      | null
  ) {
    return fsp.writeFile(file, data, options);
  }

  @AccessFallback(SudoCommandExecutor.writeFile)
  static writeFileWithElevatedAccess(
    file: PathLike | FileHandle,
    data:
      | string
      | NodeJS.ArrayBufferView
      | Iterable<string | NodeJS.ArrayBufferView>
      | AsyncIterable<string | NodeJS.ArrayBufferView>
      | Stream,
    options?:
      | (ObjectEncodingOptions & {
          mode?: Mode | undefined;
          flag?: OpenMode | undefined;
        } & Abortable)
      | BufferEncoding
      | null
  ) {
    return fsp.writeFile(file, data, options);
  }

  static unlink(...params: Parameters<typeof fsp.unlink>) {
    return fsp.unlink(...params);
  }

  static mkdir(...params: Parameters<typeof fsp.mkdir>) {
    return fsp.mkdir(...params);
  }

  @AccessFallback(SudoCommandExecutor.mkdir)
  static mkdirWithElevatedAccess(...params: Parameters<typeof fsp.mkdir>) {
    return fsp.mkdir(...params);
  }

  static rmdir(...params: Parameters<typeof fsp.rmdir>) {
    return fsp.rmdir(...params);
  }

  static rename(...params: Parameters<typeof fsp.rename>) {
    return fsp.rename(...params);
  }

  static cp(...params: Parameters<typeof fsp.cp>) {
    return fsp.cp(...params);
  }
}
