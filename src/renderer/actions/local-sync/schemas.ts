import { Type } from "@sinclair/typebox";

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
  Type.Union([Type.String(), Type.Number()])
);

export const EnvironmentRecord = Type.Object({
  name: Type.String(),
  variables: Variables,
});
