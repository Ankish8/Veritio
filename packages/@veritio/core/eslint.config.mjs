import { defineConfig } from "eslint/config";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextTs,
  {
    ignores: ["dist/**", "build/**", "*.tsbuildinfo"],
  },
]);

export default eslintConfig;
