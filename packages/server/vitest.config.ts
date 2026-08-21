import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    env: {
      GOOGLE_GENERATIVE_AI_API_KEY: "dummy-key"
    }
  }
});
