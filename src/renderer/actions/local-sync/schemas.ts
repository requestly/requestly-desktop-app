/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import { Type } from "@sinclair/typebox";

export const Config = Type.Object({
  version: Type.String(),
});

export enum EnvironmentVariableType {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Secret = "secret",
}

export enum ApiMethods {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}

export enum AuthType {
  INHERIT = "INHERIT",
  NO_AUTH = "NO_AUTH",
  API_KEY = "API_KEY",
  BEARER_TOKEN = "BEARER_TOKEN",
  BASIC_AUTH = "BASIC_AUTH",
}

interface KeyValuePair {
  id: number;
  key: string;
  value: string;
  isEnabled: boolean;
  type?: string;
}

type RequestBodyContainer = {
  text?: string;
  form?: KeyValuePair[];
};

export enum RequestContentType {
  RAW = "text/plain",
  JSON = "application/json",
  FORM = "application/x-www-form-urlencoded",
}

export const Auth = Type.Object({
  authConfigStore: Type.Object({
    API_KEY: Type.Optional(
      Type.Object({
        addTo: Type.String(),
        key: Type.String(),
        value: Type.String(),
      })
    ),
    BASIC_AUTH: Type.Optional(
      Type.Object({
        username: Type.String(),
        password: Type.String(),
      })
    ),
    BEARER_TOKEN: Type.Optional(
      Type.Object({
        bearer: Type.String(),
      })
    ),
  }),
  currentAuthType: Type.Enum(AuthType),
});

export const Description = Type.String();

export const ApiRecord = Type.Object({
  name: Type.String(),
  url: Type.String(),
  method: Type.Enum(ApiMethods),
  queryParams: Type.Optional(
    Type.Array(
      Type.Object({
        id: Type.Number(),
        key: Type.String(),
        value: Type.Optional(Type.String()),
        isEnabled: Type.Boolean(),
        type: Type.Optional(Type.String()),
      })
    )
  ),
  headers: Type.Optional(
    Type.Array(
      Type.Object({
        id: Type.Number(),
        key: Type.String(),
        value: Type.Optional(Type.String()),
        isEnabled: Type.Boolean(),
        type: Type.Optional(Type.String()),
      })
    )
  ),
  body: Type.Optional(Type.Any()),
  bodyContainer: Type.Optional(Type.Any()),
  contentType: Type.Optional(Type.Enum(RequestContentType)),
  auth: Type.Optional(Auth),
  scripts: Type.Optional(
    Type.Object({
      preRequest: Type.String(),
      postResponse: Type.String(),
    })
  ),
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

export const GlobalConfig = Type.Object({
  version: Type.Number(),
  workspaces: Type.Array(
    Type.Object({
      id: Type.String(),
      name: Type.String(),
      path: Type.String(),
    })
  ),
});
