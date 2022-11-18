import { SSL_PROXYING, USER_PREFERENCE } from "./action-types";
import { ISource } from "./ssl-proxying";

type Payload = SourcePayload & SourcesPayload & DeletePayload;

export interface StorageAction {
  type: SSL_PROXYING | USER_PREFERENCE;
  payload?: Payload;
}
export interface SourcePayload {
  data: ISource;
}

export interface SourcesPayload {
  data: ISource[];
}

export interface DeletePayload {
  id: string;
}
