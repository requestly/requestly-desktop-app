export interface SSLProxyingJsonObj {
  enabledAll: boolean;
  inclusionList: {};
  exclusionList: {};
}

// TODO @sahil: Move this to common/constants
export interface ISource {
  id: string;
  filters: any;
  key: "Url" | "host" | "path";
  operator: "Equals" | "Contains" | "Matches" | "Wildcard_Matches";
  value: any;
}
