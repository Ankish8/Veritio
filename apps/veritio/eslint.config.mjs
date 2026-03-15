// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import _storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "react/no-unescaped-entities": "off",
      // React Compiler rules — warn-only during migration to React 19 Compiler
      // These enforce strict React 19 Compiler patterns; downgrade to warnings for gradual adoption
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/invariant": "warn",
    },
  },
  // Storybook render functions are valid React components but use lowercase "render" name
  {
    files: ["**/*.stories.tsx", "**/*.stories.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated files
    ".motia/compiled/**",
    "scripts/archive/**",
    "dist/**",
    "proxy.mjs",
  ]),
]);

export default eslintConfig;
