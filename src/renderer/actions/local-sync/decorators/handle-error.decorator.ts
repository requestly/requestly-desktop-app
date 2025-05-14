/* eslint-disable */
import { isThenable } from "../common-utils";
import { ErrorCode, FileSystemError, FileTypeEnum } from "../types";

export function HandleError(
  target: any,
  _propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value!;

  descriptor.value = function (...args: any[]) {
    try {
      const possiblePromiseResult = originalMethod.apply(target, args);
      if (isThenable<FileSystemError>(possiblePromiseResult)) {
        return possiblePromiseResult.catch((e) => {
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
