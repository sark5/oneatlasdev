import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/api",

  testMatch: "**/*.pw.ts",

  fullyParallel: false,

  forbidOnly: Boolean(process.env.CI),

  retries: process.env.CI ? 1 : 0,

  workers: 1,

  reporter: "list",

  timeout: 30_000,

  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL:
      process.env.SMOKE_BASE_URL ??
      "http://127.0.0.1:3000",

    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
});
