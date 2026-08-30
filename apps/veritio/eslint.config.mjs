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
  // Guardrail: prevent regressing to anon-key Supabase clients in app code.
  // The anon key bypasses Better Auth session checks and exposes whatever
  // the RLS policies leave open. Always prefer createServiceRoleClient on
  // the server, or call API routes from the browser. The realtime hooks
  // are the one legitimate browser-anon use (broadcast WebSocket auth).
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "src/lib/supabase/client.ts",
      "src/lib/supabase/server.ts",
      "src/lib/supabase/index.ts",
      "src/lib/supabase/motia-client.ts",
      "src/hooks/use-realtime-*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/client",
              message:
                "Anon-key browser Supabase client is restricted. Call a Next.js API route instead, or — if you genuinely need browser realtime — add this file to the ignores list in eslint.config.mjs.",
            },
          ],
          patterns: [
            {
              group: ["@/lib/supabase/server"],
              importNames: ["createClient"],
              message:
                "Anon-key server Supabase client is restricted. Use createServiceRoleClient from the same module instead.",
            },
          ],
        },
      ],
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
    // Written by scripts/generate-step-index.ts on every dev/build run.
    "src/backend/step-index.generated.ts",
    "scripts/archive/**",
    "dist/**",
    "proxy.mjs",
  ]),
]);

export default eslintConfig;
