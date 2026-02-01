const {
    defineConfig,
    globalIgnores,
} = require("eslint/config");

const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        ecmaVersion: 2022,
        sourceType: "module",
        parserOptions: {},
    },

    extends: compat.extends("eslint:recommended"),

    rules: {
        "prettier/prettier": "off",
    },

    settings: {
        "import/resolver": {
            node: {
                extensions: [".js", ".jsx", ".ts", ".tsx"],
                moduleDirectory: ["node_modules", "./src/"],
            },

            webpack: {
                config: require.resolve("./.erb/configs/webpack.config.eslint.ts"),
            },

            typescript: {},
        },

        "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
        },
    },
}, {
    files: ["**/*.ts", "**/*.tsx"],
    extends: compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"),

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2020,
        sourceType: "module",

        parserOptions: {
            project: "./tsconfig.json",
            tsconfigRootDir: __dirname,
            createDefaultProgram: true,
        },
    },

    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    rules: {
        "@typescript-eslint/no-unused-vars": ["warn", {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
        }],
        "@typescript-eslint/no-explicit-any": "off",
    },
}, {
    files: ["**/*.js", "**/*.jsx"],

    languageOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        parserOptions: {},
    },
}, globalIgnores([
    "**/logs",
    "**/*.log",
    "**/pids",
    "**/*.pid",
    "**/*.seed",
    "**/coverage",
    "**/.eslintcache",
    "**/node_modules",
    "**/.DS_Store",
    "release/app/dist",
    "release/build",
    ".erb/dll",
    "**/.idea",
    "**/npm-debug.log.*",
    "**/*.css.d.ts",
    "**/*.sass.d.ts",
    "**/*.scss.d.ts",
])]);
