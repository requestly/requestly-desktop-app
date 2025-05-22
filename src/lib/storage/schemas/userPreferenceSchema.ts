import { DEFAULT_PROXY_PORT } from "../constants";

export const userPreferenceSchema = {
  defaultPort: {
    type: "number",
    default: DEFAULT_PROXY_PORT
  },

  isEnabled: {
        type: "boolean",
        default: false,
    },
    storePath: {
        type: "string",
        default: "",
    },
    filter: {
        type: "array",
        items: {
            type: "string",
        },
        default: [],
    },
}