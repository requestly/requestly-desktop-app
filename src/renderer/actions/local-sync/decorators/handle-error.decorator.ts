/* eslint-disable */
import { captureException } from "@sentry/browser";
import { isThenable } from "../common-utils";
import { ErrorCode, FileSystemError, FileTypeEnum } from "../types";

export function HandleError(
  _target: any,
  _propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value!;

  descriptor.value = function (...args: any[]) {
    try {
      const possiblePromiseResult = originalMethod.apply(this, args);
      if (isThenable<FileSystemError>(possiblePromiseResult)) {
        return possiblePromiseResult.catch((e) => {
          captureException(e, {
            tags:{
              "class": "decorator" // can remove tag if required
            }
          });
          return {
            type: "error",
            error: {
              code: ErrorCode.UNKNOWN,
              message: e.message || "An unexpected error has occured!",
              path: e.path || "Unknown path",
              fileType: FileTypeEnum.UNKNOWN,
            },
          };
        });
      }
      return possiblePromiseResult;
    } catch (e: any) {
      captureException(e);
      return {
        type: "error",
        error: {
          code: ErrorCode.UNKNOWN,
          message: e.message || "An unexpected error has occured!",
          path: e.path || "Unknown path",
          fileType: FileTypeEnum.UNKNOWN,
        },
      };
    }
  };
}
