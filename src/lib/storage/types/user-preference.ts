export interface UserPreferenceObj {
  defaultPort: number;
  localFileLogConfig: {
    isEnabled: boolean;
    storePath: string;
    filter: string[]
  };
}

export interface ISource {
  defaultPort: number;
  isLocalLoggingEnabled: boolean;
  logStorePath: string;
  localLogFilterfilter: string[]
}
