export const offlinelogConfigSchema = {
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