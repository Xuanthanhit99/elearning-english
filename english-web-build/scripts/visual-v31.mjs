import { chromium, request as playwrightRequest } from "playwright";
import fs from "node:fs/promises";

const WEB = process.env.VISUAL_WEB_URL || "http://127.0.0.1:3000";
const API = process.env.VISUAL_API_URL || "http://127.0.0.1:3002";
const email = "visual-v31@beaconvie.test";
const password = "VisualGate2026!";
const statePath = "artifacts/visual-v31/auth-state.json";
const surfaces = [
  ["home", "/dashboard"],
  ["practice", "/learn"],
  ["game", "/arena"],
  ["together", "/study-rooms"],
  ["learning-path", "/learning-path"],
  ["vocabulary", "/vocabulary"],
  ["grammar", "/grammar"],
];

await fs.mkdir("artifacts/visual-v31", { recursive: true });

async function createAuthState() {
  const request = await playwrightRequest.newContext();
  const register = await request.post(API + "/auth/register", { data: { fullName: "Minh", email, password } });
  if (![200, 201, 400].includes(register.status())) throw new Error("Visual fixture registration failed: " + register.status());
  const login = await request.post(API + "/auth/login", { data: { email, password, rememberMe: false } });
  if (!login.ok()) throw new Error("Visual fixture login failed: " + login.status());
  const fixture = await request.post(API + "/learning-path/visual-fixture", { data: {} });
  if (!fixture.ok()) throw new Error("Learning Path visual fixture failed: " + fixture.status());
  await request.storageState({ path: statePath });
  await request.dispose();
}
await createAuthState();

async function stabilizePage(page) {
  const closeWelcome = page.getByRole("button", { name: "Đóng", exact: true });
  if (await closeWelcome.isVisible().catch(() => false)) {
    await closeWelcome.click();
    await closeWelcome.waitFor({ state: "hidden" });
  }
}

async function capture(name, path, viewport) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, storageState: statePath, reducedMotion: "reduce", colorScheme: "light" });
  const page = await context.newPage();
  if (path === "/vocabulary") {
    const json = (body) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    await page.route("**/vocabulary/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/vocabulary/profile")) return route.fulfill(json({ level: "A1", dailyWordTarget: 3 }));
      if (url.endsWith("/vocabulary/today")) return route.fulfill(json({ id: "visual-today", status: "AVAILABLE", completed: false, locked: false, topic: { id: "visual-topic", name: "Daily life" }, words: [] }));
      if (url.endsWith("/vocabulary/daily/visual-today/words")) return route.fulfill(json({ words: [] }));
      if (url.endsWith("/vocabulary/weekly-plan")) return route.fulfill(json({ days: [] }));
      if (url.endsWith("/vocabulary/me/stats")) return route.fulfill(json({}));
      if (url.endsWith("/vocabulary/review/suggestions")) return route.fulfill(json([]));
      if (url.endsWith("/vocabulary/notebook")) return route.fulfill(json([]));
      if (url.endsWith("/vocabulary/challenge/today")) return route.fulfill(json(null));
      return route.fulfill(json({}));
    });
  }
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const dynamicSurface = path === "/vocabulary" || path === "/grammar";
  const response = await page.goto(WEB + path, { waitUntil: dynamicSurface ? "domcontentloaded" : "networkidle", timeout: 45_000 });
  if (!response || response.status() >= 400) throw new Error(name + " navigation failed");
  if (page.url().includes("/login")) throw new Error(name + " redirected to login");
  await stabilizePage(page);
  if (path === "/vocabulary") await page.locator("h1").first().waitFor({ state: "visible", timeout: 30_000 });
  if (path === "/grammar") await page.getByRole("heading", { name: "Ngữ pháp", exact: true }).first().waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: `artifacts/visual-v31/${name}.png`, fullPage: viewport.width > 390 });
  if (errors.length) console.warn(name + " page errors:", errors);
  await browser.close();
}

for (const [label, path] of surfaces) {
  await capture("desktop-" + label, path, { width: 1536, height: 1024 });
  await capture("mobile-" + label, path, { width: 390, height: 844 });
}

for (const [prefix, viewport] of [["desktop", { width: 1536, height: 1024 }], ["mobile", { width: 390, height: 844 }]]) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, storageState: statePath, reducedMotion: "reduce", colorScheme: "light" });
  const page = await context.newPage();
  await page.goto(WEB + "/learning-path", { waitUntil: "networkidle", timeout: 45_000 });
  await stabilizePage(page);
  const lessonCta = page.getByRole("button", { name: /^(Bắt đầu bài học|Tiếp tục bài học|Bắt đầu|Tiếp tục)$/ }).filter({ visible: true }).first();
  if (await lessonCta.count() === 0) throw new Error("No visible real Focus Lesson CTA available from Learning Path");
  await Promise.all([page.waitForURL((url) => /^\/learning-path\/lessons\/[^/]+\/?$/.test(url.pathname)), lessonCta.click()]);
  await page.waitForLoadState("networkidle");
  if (page.url().includes("/login")) throw new Error("Focus Lesson redirected to login");
  await stabilizePage(page);
  await page.getByRole("heading", { name: "Tập trung vào một bài học" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Đang tải bài học...").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
  await page.screenshot({ path: `artifacts/visual-v31/${prefix}-focus-lesson.png`, fullPage: true });
  await browser.close();
}
