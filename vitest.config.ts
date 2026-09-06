import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  // Next's tsconfig sets jsx: "preserve", which Vite's esbuild cannot
  // transform — plugin-react handles JSX for test-adjacent components.
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // Legacy console suite (tests/auth_suite.test.ts) is a standalone script
    // with its own runner that calls process.exit — keep it out of vitest.
    exclude: ["**/node_modules/**", "tests/auth_suite.test.ts"],
    // The money-path tests exercise engine singletons; keep each file in its
    // own worker so seeded state never leaks between suites.
    isolate: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
