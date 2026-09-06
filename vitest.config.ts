import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
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
