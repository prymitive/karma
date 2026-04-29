import eslintJs from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import reactCompiler from "eslint-plugin-react-compiler";
import jest from "eslint-plugin-jest";
import prettier from "eslint-config-prettier";

export default defineConfig(
  globalIgnores(["playwright.config.ts", "src/e2e/", "coverage/"]),
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    extends: [
      eslintJs.configs.recommended,
      ...tseslint.configs.recommended,
      eslintReact.configs["recommended-typescript"],
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
      // MobX autorun/reaction manage their own reactive subscriptions inside useEffect; react-compiler plugin already covers standard hooks
      "@eslint-react/exhaustive-deps": "off",
      // setState in useEffect is the standard pattern for async fetches, MobX reactions, and timer-driven updates
      "@eslint-react/set-state-in-effect": "off",
      // index keys are used in static display-only lists (split strings, SVG samples, error messages) with no stable ID
      "@eslint-react/no-array-index-key": "off",
      // cloneElement is used by react-transition-group integration, replacing it would require a major refactor
      "@eslint-react/no-clone-element": "off",
      // Children.map is used by the Toast container with react-transition-group TransitionGroup
      "@eslint-react/no-children-map": "off",
      // dangerouslySetInnerHTML is intentional for rendering trusted server-provided HTML
      "@eslint-react/dom-no-dangerously-set-innerhtml": "off",
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ...reactCompiler.configs.recommended,
  },
  {
    files: [
      "src/**/__mocks__/*.ts",
      "src/**/__mocks__/**/*.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    ...jest.configs["flat/recommended"],
    rules: {
      ...jest.configs["flat/recommended"].rules,
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "jest/expect-expect": "off",
      "react-compiler/react-compiler": "off",
      "@eslint-react/no-create-ref": "off",
      "@eslint-react/no-nested-component-definitions": "off",
    },
  },
  prettier,
);
