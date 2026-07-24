#!/usr/bin/env node
/**
 * Minimal responsive regression check for the duplicate-navigation defect
 * class fixed in docs/frontend-responsive-audit-report.md.
 *
 * Requires: the frontend dev/prod server and backend API already running
 * (defaults to http://localhost:3000 / http://localhost:3002, override with
 * FRONTEND_URL / BACKEND_URL). Requires the "playwright" package and a
 * Chromium browser installed (`npx playwright install chromium`).
 *
 * Usage: node scripts/responsive-regression-check.mjs
 *
 * Not wired into `npm run build` or CI — run manually against a live dev
 * server when touching AppShell, AppSidebar, AppHeader, MobileNavigation,
 * or any page-level layout shell.
 */
import { chromium } from "playwright";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3002";

const CHECKS = [
  { route: "/dashboard", vp: { w: 390, h: 844 }, expect: { sidebar: 0, header: 1, bottomNav: 1 } },
  { route: "/dashboard", vp: { w: 820, h: 1180 }, expect: { sidebar: 0, header: 1, bottomNav: 1 } },
  { route: "/dashboard", vp: { w: 1280, h: 800 }, expect: { sidebar: 1, header: 1, bottomNav: 0 } },
  { route: "/dashboard", vp: { w: 1440, h: 900 }, expect: { sidebar: 1, header: 1, bottomNav: 0 } },
  { route: "/check-word", vp: { w: 390, h: 844 }, expect: { sidebar: 0, header: 1, bottomNav: 1 } },
  { route: "/check-word", vp: { w: 1280, h: 800 }, expect: { sidebar: 1, header: 1, bottomNav: 0 } },
  { route: "/check-word", vp: { w: 1920, h: 1080 }, expect: { sidebar: 1, header: 1, bottomNav: 0 } },
  { route: "/grammar/topic/x", vp: { w: 1280, h: 800 }, expect: { sidebar: 1, header: 1, bottomNav: 0 } },
  { route: "/grammar/lesson/x", vp: { w: 1280, h: 800 }, expect: { sidebar: 1, header: 1, bottomNav: 0 } },
  { route: "/reading/categories", vp: { w: 1280, h: 800 }, expect: { sidebar: 1, header: 1, bottomNav: 0 } },
  { route: "/reading/history", vp: { w: 1280, h: 800 }, expect: { sidebar: 1, header: 1, bottomNav: 0 } },
  { route: "/writing/homelog", vp: { w: 1280, h: 800 }, expect: { sidebar: 1, header: 1, bottomNav: 0 } },
  { route: "/speaking/situations", vp: { w: 1280, h: 800 }, expect: { sidebar: 1, header: 1, bottomNav: 0 } },
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  const email = `responsive-check-${Date.now()}@example.com`;
  const password = "TestPass!2345";
  await context.request.post(`${BACKEND_URL}/auth/register`, {
    data: { fullName: "Responsive Check Bot", email, password },
  });
  const loginRes = await context.request.post(`${BACKEND_URL}/auth/login`, {
    data: { email, password, rememberMe: true },
  });
  if (!(loginRes.status() >= 200 && loginRes.status() < 300)) {
    console.error("Could not authenticate against", BACKEND_URL, "- is the backend running?");
    process.exit(2);
  }

  let failures = 0;
  for (const check of CHECKS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: check.vp.w, height: check.vp.h });
    await page.goto(FRONTEND_URL + check.route, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForSelector(".lumiverse-shell", { timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(300);

    const result = await page.evaluate(() => {
      const visible = (el) => {
        const cs = getComputedStyle(el);
        return cs.display !== "none" && cs.visibility !== "hidden";
      };
      const count = (sel) => Array.from(document.querySelectorAll(sel)).filter(visible).length;
      const bodyText = document.body ? document.body.innerText : "";
      return {
        sidebar: count('[data-testid="app-sidebar-desktop"]'),
        header: count('[data-testid="app-header"]'),
        bottomNav: count('[data-testid="app-bottom-nav"]'),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        legacyChrome: bodyText.includes("StudyArena") || bodyText.includes("Minh Anh"),
      };
    });

    const mismatches = Object.entries(check.expect).filter(([k, v]) => result[k] !== v);
    const overflowBad = result.overflow > 2;
    const ok = mismatches.length === 0 && !overflowBad && !result.legacyChrome;

    console.log(
      `${ok ? "PASS" : "FAIL"} ${check.route} @ ${check.vp.w}x${check.vp.h} -> ${JSON.stringify(result)}`
    );
    if (!ok) failures++;
    await page.close();
  }

  await browser.close();
  if (failures > 0) {
    console.error(`\n${failures} responsive regression check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll responsive regression checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
