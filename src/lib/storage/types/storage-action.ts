import { AccessedFile } from "../action-processors/accessed-files";
import { ACCESSED_FILES, SSL_PROXYING, USER_PREFERENCE } from "./action-types";
import { ISource as SSLSource } from "./ssl-proxying";
import { ISource as UserPrefereceSource } from "./user-preference"


export interface SourcePayload {
  data: SSLSource | UserPrefereceSource;
}

export interface SourcesPayload {
  data: SSLSource[] | UserPrefereceSource[] | AccessedFile;
}

export interface DeletePayload {
  id: string;
}

type Payload = SourcePayload & SourcesPayload & DeletePayload;

export interface StorageAction {
  type: SSL_PROXYING | USER_PREFERENCE | ACCESSED_FILES;
  payload?: Payload;
}
