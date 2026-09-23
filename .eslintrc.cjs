module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["react-refresh"],
  ignorePatterns: ["dist", "node_modules", "scripts", "_superseded"],
  rules: {
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
  overrides: [
    {
      // Context files export a provider *and* its hook by design. That is a
      // fast-refresh granularity note, not a correctness problem.
      files: ["src/lib/providers.tsx", "src/lib/chats-context.tsx"],
      rules: { "react-refresh/only-export-components": "off" },
    },
  ],
};
