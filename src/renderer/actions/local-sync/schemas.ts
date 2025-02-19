import { Type } from "@sinclair/typebox";
import { EnvironmentVariableType } from "./types";

export const Config = Type.Object({
  version: Type.String(),
});

export enum ApiMethods {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}
export const ApiRecord = Type.Object({
  name: Type.String(),
  url: Type.String(),
  method: Type.Enum(ApiMethods),
});

export const Variables = Type.Record(
  Type.String(),
  Type.Object({
    id: Type.Number(),
    value: Type.Union([Type.String(), Type.Number(), Type.Boolean()]),
    type: Type.Enum(EnvironmentVariableType),
    isSecret: Type.Boolean(),
  })
);

export const EnvironmentRecord = Type.Object({
  name: Type.String(),
  variables: Variables,
});
