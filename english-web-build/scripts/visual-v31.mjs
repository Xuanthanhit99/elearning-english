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
];

await fs.mkdir("artifacts/visual-v31", { recursive: true });

async function createAuthState() {
  const request = await playwrightRequest.newContext();
  const register = await request.post(API + "/auth/register", {
    data: { fullName: "Visual V3.1", email, password },
  });
  if (![200, 201, 400].includes(register.status())) {
    throw new Error("Visual fixture registration failed: " + register.status());
  }
  const login = await request.post(API + "/auth/login", {
    data: { email, password, rememberMe: false },
  });
  if (!login.ok()) throw new Error("Visual fixture login failed: " + login.status());

  const fixture = await request.post(API + "/learning-path/visual-fixture", {
    data: {},
  });
  if (!fixture.ok()) {
    throw new Error("Learning Path visual fixture failed: " + fixture.status());
  }

  await request.storageState({ path: statePath });
  await request.dispose();
}

await createAuthState();

async function capture(name, path, viewport) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport,
    storageState: statePath,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const response = await page.goto(WEB + path, { waitUntil: "networkidle", timeout: 45_000 });
  if (!response || response.status() >= 400) throw new Error(name + " navigation failed");
  if (page.url().includes("/login")) throw new Error(name + " redirected to login");
  await page.screenshot({ path: `artifacts/visual-v31/${name}.png`, fullPage: true });
  if (errors.length) console.warn(name + " page errors:", errors);
  await browser.close();
}

for (const [label, path] of surfaces) {
  await capture("desktop-" + label, path, { width: 1440, height: 1000 });
  await capture("mobile-" + label, path, { width: 390, height: 844 });
}

// Focus Lesson must be reached from the real Learning Path UI rather than a fabricated lesson id.
for (const [prefix, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport,
    storageState: statePath,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(WEB + "/learning-path", { waitUntil: "networkidle", timeout: 45_000 });
  const lessonLinks = page.locator('a[href*="/learning-path/"]');
  let lessonLink = null;
  for (let index = 0; index < await lessonLinks.count(); index += 1) {
    const candidate = lessonLinks.nth(index);
    const href = await candidate.getAttribute("href");
    if (!href) continue;
    const pathname = new URL(href, WEB).pathname.replace(/\/+$/, "");
    if (!pathname.startsWith("/learning-path/")) continue;
    if (!(await candidate.isVisible())) continue;
    lessonLink = candidate;
    break;
  }
  if (!lessonLink) throw new Error("No visible real Focus Lesson link available from Learning Path");
  await lessonLink.click();
  await page.waitForLoadState("networkidle");
  if (page.url().includes("/login")) throw new Error("Focus Lesson redirected to login");
  await page.screenshot({ path: `artifacts/visual-v31/${prefix}-focus-lesson.png`, fullPage: true });
  await browser.close();
}
