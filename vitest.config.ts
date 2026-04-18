import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
    },
  },
  resolve: {
    alias: [
      {
        find: /(\.\.\/)+src\/(.+)\.js$/,
        replacement: path.resolve(__dirname, "src/$2.ts"),
        customCondition: undefined,
      },
    ],
  },
});
