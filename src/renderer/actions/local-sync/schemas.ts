import { Type } from "@sinclair/typebox";

export const Config = Type.Object({
  version: Type.String(),
});

export enum ApiMethods {
  GET = "GET",
}
export const ApiRecord = Type.Object({
  name: Type.String(),
  url: Type.String(),
  method: Type.Enum(ApiMethods),
});
