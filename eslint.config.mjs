import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The React Compiler rules in eslint-plugin-react-hooks are new and strict: they flag patterns that work today (reading a ref
  // during render, setting state in an effect). Keep them visible as warnings and fix them as components are touched.
  {
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  // Storybook `render` functions are components, but ESLint cannot tell, so it reports their hooks as misplaced.
  {
    files: ["**/*.stories.@(ts|tsx)"],
    rules: { "react-hooks/rules-of-hooks": "off", "react-hooks/static-components": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored, minified or tooling files are not ours to lint.
    "brand/**",
    "public/vendor/**",
    ".claude/**",
    ".agents/**",
    "**/*.min.js",
    "storybook-static/**",
  ]),
]);

export default eslintConfig;
