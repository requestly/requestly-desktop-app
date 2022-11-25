import { SSL_PROXYING, USER_PREFERENCE } from "./action-types";
import { ISource as SSLSource } from "./ssl-proxying";
import { ISource as UserPrefereceSource } from "./user-preference"
type Payload = SourcePayload & SourcesPayload & DeletePayload;

export interface StorageAction {
  type: SSL_PROXYING | USER_PREFERENCE;
  payload?: Payload;
}
export interface SourcePayload {
  data: SSLSource | UserPrefereceSource;
}

export interface SourcesPayload {
  data: SSLSource[] | UserPrefereceSource[];
}

export interface DeletePayload {
  id: string;
}
