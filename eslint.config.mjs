import { defineConfig, globalIgnores } from "eslint/config";
import tsParser from "@typescript-eslint/parser";

/**
 * Workspace-root ESLint config.
 *
 * Scope: packages/core and packages/adapters-browser.
 * apps/demo has its own eslint.config.mjs that uses eslint-config-next.
 *
 * Core package boundary — packages/core/src must stay framework-free,
 * browser-free, and brand-free so it can be published and consumed anywhere.
 */
const CORE_PATHS = [
  'packages/core/src/**/*.ts',
];

const FORBIDDEN_FROM_CORE = [
  { name: 'react' },
  { name: 'react-dom' },
  { name: 'next' },
  { name: 'next/*' },
];

const eslintConfig = defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/coverage/**",
    "apps/**",      // apps/demo has its own eslint config
  ]),
  {
    // Apply TypeScript parser to all .ts files in packages/
    files: ['packages/**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
  },
  {
    // Core boundary: no React, no Next, no browser APIs.
    files: CORE_PATHS,
    rules: {
      'no-restricted-imports': ['error', { paths: FORBIDDEN_FROM_CORE }],
    },
  },
]);

export default eslintConfig;
