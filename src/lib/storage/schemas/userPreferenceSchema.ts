import { DEFAULT_PROXY_PORT } from "../constants";

export const userPreferenceSchema = {
  defaultPort: {
    type: "number",
    default: DEFAULT_PROXY_PORT
  }
}