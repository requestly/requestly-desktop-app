module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  rules: {
    "prettier/prettier": "off",
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
      ],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        createDefaultProgram: true,
      },
      plugins: ["@typescript-eslint"],
      rules: {
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
      },
    },
    {
      files: ["*.js", "*.jsx"],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
  ],
  settings: {
    "import/resolver": {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
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
};
