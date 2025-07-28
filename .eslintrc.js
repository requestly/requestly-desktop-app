module.exports = {
  extends: ["erb"],
  rules: {
    // A temporary hack related to IDE not resolving correct package.json
    "import/no-extraneous-dependencies": "off",
    "no-console": "off",
    "import/order": "off",
    "import/extensions": "off",
    "import/prefer-default-export": "off",
    "no-await-in-loop": "off",
    "prettier/prettier": "off",
    "no-nested-ternary": "off",
    "no-restricted-syntax": "off",
    "no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
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
