import { defineConfig } from "eslint/config";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextTs,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
  },
  {
    ignores: ["dist/**", "build/**", "*.tsbuildinfo"],
  },
]);

export default eslintConfig;
