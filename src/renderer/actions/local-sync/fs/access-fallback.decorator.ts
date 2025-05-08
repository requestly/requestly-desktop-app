/* eslint-disable */
import { isThenable } from "../common-utils";

function isAccessError(error: any) {
  return error.code === "EACCES";
}

export function AccessFallback<TArgs extends any[], TReturn>(
  fallback: (...args: TArgs) => TReturn
) {
  return function (
    target: any,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: TArgs) => TReturn>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = function (...args: TArgs): TReturn {
      try {
        const possiblePromiseResult =  originalMethod.apply(target, args);
        if(isThenable(possiblePromiseResult)) {
          return possiblePromiseResult.catch(e => {
            if(isAccessError(e)) {
              return fallback(...args);
            }
            throw e;
          }) as TReturn // casting manually to let TS know that if originalMethod's return is a promise then so is ours
        }
        return possiblePromiseResult;
      } catch (error: any) {
        if(isAccessError(error)) {
          return fallback(...args);
        }
        throw error;
      }
    };
  };
}
