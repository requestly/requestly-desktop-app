import { SecretReference } from "./types";

export enum SecretsErrorCode {
  PROVIDER_NOT_FOUND = "provider_not_found",

  AUTH_FAILED = "auth_failed",
  PERMISSION_DENIED = "permission_denied",

  SECRET_NOT_FOUND = "secret_not_found",
  SECRET_FETCH_FAILED = "secret_fetch_failed",

  STORAGE_READ_FAILED = "storage_read_failed",
  STORAGE_WRITE_FAILED = "storage_write_failed",

  UNKNOWN = "unknown",
}

export interface SecretsError {
  code: SecretsErrorCode;
  message: string;
  providerId?: string;
  secretRef?: SecretReference;
  cause?: Error; // Original error
}

export type SecretsManagerError = {
  type: "error";
  error: SecretsError;
};

export type SecretsSuccess<T> = T extends void
  ? { type: "success" }
  : { type: "success"; data: T };

export type SecretsResult<T> = SecretsSuccess<T> | SecretsManagerError;

export type SecretsResultPromise<T> = Promise<SecretsResult<T>>;

export function createSecretsError(
  code: SecretsErrorCode,
  message: string,
  context?: Omit<SecretsError, "code" | "message">
): SecretsManagerError {
  return {
    type: "error",
    error: {
      code,
      message,
      ...context,
    },
  };
}
