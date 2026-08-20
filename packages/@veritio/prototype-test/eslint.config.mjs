import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Mirrors apps/veritio/eslint.config.mjs. This package is compiled by the app's
// Next build (transpilePackages), so it should be held to the same rules.
//
// Linting here used to be stubbed out entirely ("Skipping lint ... needs ESLint
// config update"), which meant the react-hooks rules never ran on the player —
// and the `eslint-disable-next-line react-hooks/exhaustive-deps` comments
// already scattered through this code were silently inert.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    ignores: ["dist/**", "build/**", "*.tsbuildinfo"],
  },
  {
    rules: {
      // Same posture as the app: `any` is a cleanup task, not a build blocker.
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
      // React Compiler rules — warn-only, matching the app's migration posture.
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/invariant": "warn",
      // Pre-existing debt surfaced the moment linting was switched back on,
      // all of it in cross-study-type code rather than anything prototype
      // specific: 8 conditional-hook calls (6 in lib/swr/crud-factory —
      // `config.operations?.x ? useCallback(...) : undefined`, which is stable
      // only because `config` is fixed per hook instance) and 12
      // components-defined-during-render in the study-flow builder. Left as
      // warnings so they stay visible in lint output instead of being hidden
      // behind the blanket skip this file replaces. Each needs a real fix.
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);

export default eslintConfig;
