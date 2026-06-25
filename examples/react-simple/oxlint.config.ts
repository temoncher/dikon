import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "react", "vitest"],
  categories: {
    correctness: "error",
    suspicious: "warn",
  },
  rules: {
    "react/jsx-key": "error",
    "react/react-in-jsx-scope": "off",
  },
});
