#!/usr/bin/env node
/**
 * Smoke test for the guest acquisition funnel entry point (homepage ->
 * placement CTA -> login with a safe redirect). Frontend-only: does not
 * require the backend, since everything checked here is served/redirected
 * by the Next.js app and middleware alone.
 *
 * Requires: the frontend dev/prod server already running (defaults to
 * http://localhost:3000, override with FRONTEND_URL) and the "playwright"
 * package with a Chromium browser installed
 * (`npx playwright install chromium`).
 *
 * Usage: node scripts/test-growth-funnel-smoke.mjs
 *
 * Not wired into `npm run build` or CI — run manually when touching
 * HomePage.tsx, Auth.tsx, or src/lib/auth-route-policy.ts /
 * src/lib/auth-redirect.ts.
 */
import { chromium } from "playwright";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let failures = 0;

  function check(label, condition) {
    if (condition) {
      console.log(`PASS  ${label}`);
    } else {
      console.error(`FAIL  ${label}`);
      failures += 1;
    }
  }

  // 1. Guest homepage loads and leads with the placement hook.
  await page.goto(FRONTEND_URL + "/", { waitUntil: "networkidle", timeout: 25000 });
  check("homepage returns real content", (await page.title()).length > 0);

  const heroCta = page.getByRole("link", { name: /Kiểm tra trình độ miễn phí/i }).first();
  check("hero placement CTA is visible", await heroCta.isVisible());

  const placementHookCta = page.getByRole("link", { name: /^Kiểm tra ngay$/i }).first();
  check("placement hook section CTA is visible", await placementHookCta.isVisible());

  // 2. Following the hero CTA as a guest lands on login with a safe,
  // internal redirect back to /placement (auth-route-policy.ts /
  // auth-redirect.ts) — never a raw crash or an open redirect.
  await heroCta.click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  const url = new URL(page.url());
  check("guest is routed to /login", url.pathname.replace(/\/$/, "") === "/login");
  check(
    "redirect target points back to /placement",
    decodeURIComponent(url.searchParams.get("redirect") || "").startsWith("/placement"),
  );

  // 3. Login page renders a real form (no backend needed for this).
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const emailOk = await emailInput
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  const passwordOk = await passwordInput
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  check("login page renders an email input", emailOk);
  check("login page renders a password input", passwordOk);

  await browser.close();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll growth-funnel smoke checks passed.");
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(2);
});
