import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      // Deliberately just the two long-standing hooks-correctness rules,
      // not eslint-plugin-react-hooks v7's whole "recommended" bundle —
      // that bundle is a much stricter, React-Compiler-oriented rule set
      // (purity, immutability, set-state-in-effect, ...) that oxlint never
      // enforced and that flags legitimate, deliberate patterns already in
      // this codebase (e.g. TextEditOverlay.tsx's seed-on-id-change effect)
      // as errors. A linter swap shouldn't force-fix working code.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Matches the oxlint config this replaces (allowConstantExport lets a
      // file export both a component and, say, a constants object without
      // breaking Vite's fast-refresh boundary).
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // tsconfig.app.json's noUnusedLocals/noUnusedParameters already cover
      // this at the type-check level — avoid reporting the same thing twice.
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // packages/commands is the portable graph-mutation core — it must
    // never depend on React or any apps/*-specific code (store, canvas,
    // UI), so a future server-side consumer (or apps/web itself) can trust
    // it stays a pure, app-agnostic dependency. Enforced here rather than
    // left as a comment, per the migration plan's cross-cutting rules.
    files: ["packages/commands/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-dom", "react/*", "react-dom/*"], message: "packages/commands must not depend on React." },
            { group: ["**/apps/*", "../../apps/*"], message: "packages/commands must not import from any apps/* package." },
          ],
        },
      ],
    },
  },
);
