export interface LogConfig {
    isEnabled: boolean;
    storePath: string;
    filter: string[]
}

export interface ISource {
    isEnabled: boolean;
    storePath: string;
    filter: string[];
}
