import { chromium } from "playwright";
import fs from "node:fs/promises";

const WEB = process.env.VISUAL_WEB_URL || "http://127.0.0.1:3000";
const API = process.env.VISUAL_API_URL || "http://127.0.0.1:3002";
const email = "visual-v31@beaconvie.test";
const password = "VisualGate2026!";
const surfaces = [
  ["home", "/dashboard"],
  ["practice", "/learn"],
  ["game", "/arena"],
  ["together", "/study-rooms"],
  ["learning-path", "/learning-path"],
];

await fs.mkdir("artifacts/visual-v31", { recursive: true });

async function prepareAuth(request) {
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
}

async function capture(name, path, viewport) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewportSize: viewport });
  await prepareAuth(context.request);
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
  const context = await browser.newContext({ viewportSize: viewport });
  await prepareAuth(context.request);
  const page = await context.newPage();
  await page.goto(WEB + "/learning-path", { waitUntil: "networkidle", timeout: 45_000 });
  const lessonLink = page.locator('a[href*="/learning-path/"]').first();
  if (await lessonLink.count() === 0) throw new Error("No real Focus Lesson link available from Learning Path");
  await lessonLink.click();
  await page.waitForLoadState("networkidle");
  if (page.url().includes("/login")) throw new Error("Focus Lesson redirected to login");
  await page.screenshot({ path: `artifacts/visual-v31/${prefix}-focus-lesson.png`, fullPage: true });
  await browser.close();
}
