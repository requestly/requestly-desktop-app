import { DEFAULT_PROXY_PORT, DEFAULT_LOCAL_FILE_LOG_CONFIG } from "../constants";

export const userPreferenceSchema = {
  defaultPort: {
    type: "number",
    default: DEFAULT_PROXY_PORT
  },

  localFileLogConfig: {
    type: "object",
    properties: {
      isEnabled: {
        type: "boolean",
      },
      storePath: {
        type: "string",
      },
      filter: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
    default: DEFAULT_LOCAL_FILE_LOG_CONFIG,
  }
}