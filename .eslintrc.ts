module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  rules: {
    "prettier/prettier": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  plugins: ["@typescript-eslint"],
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
