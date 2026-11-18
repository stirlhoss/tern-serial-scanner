import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
    rules: {
      // Top-level lifecycle hooks break SolidStart streaming SSR (deferStream).
      // Use createEffect (client-only) and register cleanup inside it instead.
      // See src/components/Nav.tsx.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "solid-js",
              importNames: ["onMount"],
              message:
                "Use createEffect for client-only side effects rather than onMount; " +
                "top-level lifecycle hooks break SolidStart streaming SSR.",
            },
            {
              name: "solid-js/web",
              importNames: ["onMount"],
              message:
                "Use createEffect for client-only side effects rather than onMount; " +
                "top-level lifecycle hooks break SolidStart streaming SSR.",
            },
          ],
        },
      ],
    },
  },
]);
