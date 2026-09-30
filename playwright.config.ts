import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const chromiumPath = "/usr/bin/chromium";
const useSystemChromium = existsSync(chromiumPath);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:8788",
    headless: true,
    colorScheme: "light",
    launchOptions: useSystemChromium ? { executablePath: chromiumPath } : {},
  },
  webServer: {
    command:
      "corepack pnpm@11.3.0 run build && corepack pnpm@11.3.0 exec wrangler dev --ip 127.0.0.1 --port 8788 --var TURNSTILE_SITE_KEY:local-test-site-key --log-level error",
    url: "http://127.0.0.1:8788/cv",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
