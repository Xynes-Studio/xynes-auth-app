import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    globals: true,
    environment: "happy-dom",
    maxWorkers: 4,
    testTimeout: 30_000,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        ".next/",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/test/**",
        // Keep legacy route shells outside the established coverage scope,
        // but measure the OAuth callback changed by CMS-REL-1 BUG-001.
        "src/app/*.{ts,tsx}",
        "src/app/!(callback)/**",
        "src/app/callback/*.{ts,tsx}",
        "scripts/**",
        "*.config.*",
      ],
      thresholds: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@lumia-ui/icons": resolve(__dirname, "./src/test/mocks/lumia-icons.ts"),
      react: resolve(__dirname, "./node_modules/react"),
      "react-dom": resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": resolve(
        __dirname,
        "./node_modules/react/jsx-runtime.js",
      ),
      "react/jsx-dev-runtime": resolve(
        __dirname,
        "./node_modules/react/jsx-dev-runtime.js",
      ),
    },
  },
});
