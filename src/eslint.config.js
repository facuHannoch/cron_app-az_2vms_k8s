import globals from "globals";
import jsRecommended from "@eslint/js";

/** @type {import('eslint').FlatESLintConfig[]} */
export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      // Define globals that you need (from Node and Jest)
      globals: {
        ...globals.node,
        // Jest globals
        describe: true,
        it: true,
        test: true,
        beforeAll: true,
        afterAll: true,
        expect: true,
        // process is included in globals.node but you can add it explicitly if needed:
        process: true,
      }
    },
    // Use the recommended rules from @eslint/js
    rules: {
      ...jsRecommended.configs.recommended.rules
    }
  }
];
