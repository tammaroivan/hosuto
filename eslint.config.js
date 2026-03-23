import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default defineConfig(
  globalIgnores(["**/dist", "**/node_modules", "**/*.gen.ts"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true, allowExportNames: ["Route"] },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: [
                "useEffect",
                "useState",
                "useRef",
                "useMemo",
                "useCallback",
                "useContext",
                "useReducer",
                "useLayoutEffect",
                "useImperativeHandle",
                "useDebugValue",
                "useDeferredValue",
                "useTransition",
                "useId",
                "useSyncExternalStore",
                "useInsertionEffect",
              ],
              message: "Import React and use React.useEffect() instead.",
            },
          ],
        },
      ],
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["apps/web/**/routes/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["apps/api/**/*.ts", "packages/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
  {
    rules: {
      "func-style": ["error", "expression"],
      curly: ["error", "all"],
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: ["if", "for", "while", "switch", "try"], next: "*" },
        { blankLine: "any", prev: ["if", "for", "while", "switch", "try"], next: "if" },
      ],
    },
  },
);
