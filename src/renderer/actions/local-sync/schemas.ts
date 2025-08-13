/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import { Type } from "@sinclair/typebox";

export const Config = Type.Object({
  version: Type.String(),
  exclude: Type.Optional(Type.Array(Type.String())),
});

export enum EnvironmentVariableType {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Secret = "secret",
}

export enum ApiEntryType {
  HTTP = "http",
  GRAPHQL = "graphql",
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

export enum RequestContentType {
  RAW = "text/plain",
  JSON = "application/json",
  FORM = "application/x-www-form-urlencoded",
  MULTIPART_FORM = "multipart/form-data",
  HTML = "text/html",
  XML = "application/xml",
  JAVASCRIPT = "application/javascript",
}

export enum AuthType {
  INHERIT = "INHERIT",
  NO_AUTH = "NO_AUTH",
  API_KEY = "API_KEY",
  BEARER_TOKEN = "BEARER_TOKEN",
  BASIC_AUTH = "BASIC_AUTH",
}

const KeyValuePair = Type.Object({
  id: Type.Number(),
  key: Type.String(),
  value: Type.String(),
  isEnabled: Type.Boolean(),
  type: Type.Optional(Type.String()),
});

const formData = Type.Object({
  id: Type.Number(),
  key: Type.String(),
  value: Type.Union([
    Type.String(),
    Type.Array(
      Type.Object({
        id: Type.String(),
        name: Type.String(),
        path: Type.String(),
        size: Type.Number(),
        source: Type.Union([
          Type.Literal("extension"),
          Type.Literal("desktop"),
        ]),
      })
    ),
  ]),
  isEnabled: Type.Boolean(),
  type: Type.Optional(Type.String()),
});

export const RequestBody = Type.Union([
  Type.String(),
  Type.Array(KeyValuePair),
  Type.Array(formData),
  Type.Null(),
]);

export const RequestBodyContainer = Type.Object({
  text: Type.Optional(Type.String()),
  form: Type.Optional(Type.Array(KeyValuePair)),
  multipartForm: Type.Optional(Type.Array(formData)),
});

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

export const BaseRequest = Type.Object({
  url: Type.String(),
  auth: Auth,
  scripts: Type.Optional(
    Type.Object({
      preRequest: Type.String(),
      postResponse: Type.String(),
    })
  ),
});

export const HttpRequest = Type.Intersect([
  BaseRequest,
  Type.Object({
    type: Type.Literal(ApiEntryType.HTTP),
    headers: Type.Optional(Type.Array(KeyValuePair)),
    queryParams: Type.Optional(Type.Array(KeyValuePair)),
    method: Type.Enum(ApiMethods),
    body: Type.Optional(RequestBody),
    bodyContainer: Type.Optional(RequestBodyContainer),
    contentType: Type.Optional(Type.Enum(RequestContentType)),
    includeCredentials: Type.Optional(Type.Boolean()),
  }),
]);

export const GraphQLRequest = Type.Intersect([
  BaseRequest,
  Type.Object({
    type: Type.Literal(ApiEntryType.GRAPHQL),
    headers: Type.Optional(Type.Array(KeyValuePair)),
    operation: Type.String(),
    variables: Type.String(),
    operationName: Type.Optional(Type.String()),
  }),
]);

export const ApiRequest = Type.Union([HttpRequest, GraphQLRequest]);

export const ApiRecord = Type.Object({
  name: Type.String(),
  request: ApiRequest,
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
