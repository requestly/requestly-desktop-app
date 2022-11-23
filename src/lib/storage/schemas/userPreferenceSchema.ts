import { DEFAULT_PROXY_PORT } from "../constants";

export const UserPreferenceSchema = {
  defaultPort: {
    type: "string",
    default: DEFAULT_PROXY_PORT
  }
}
