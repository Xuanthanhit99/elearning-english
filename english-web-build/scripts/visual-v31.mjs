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
  ["reading", "/reading"],
  ["listening", "/listening"],
  ["speaking", "/speaking"],
  ["writing", "/writing"],
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
  const closeWelcome = page.getByRole("button", { name: "Đóng", exact: true }).first();
  const appeared = await closeWelcome.waitFor({ state: "visible", timeout: 2_500 }).then(() => true).catch(() => false);
  if (appeared) {
    await closeWelcome.click();
    await closeWelcome.waitFor({ state: "hidden", timeout: 5_000 });
  }
}

async function capture(name, path, viewport) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, storageState: statePath, reducedMotion: "reduce", colorScheme: "light" });
  const page = await context.newPage();
  if (path === "/vocabulary") {
    const json = (body) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    await page.route(API + "/vocabulary{,/**}", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/vocabulary/profile")) return route.fulfill(json({ level: "A1", dailyWordTarget: 3 }));
      if (url.endsWith("/vocabulary/today")) return route.fulfill(json({ id: "visual-today", status: "AVAILABLE", completed: false, locked: false, topic: { id: "visual-topic", name: "Daily life" } }));
      if (url.endsWith("/vocabulary/daily/visual-today/words")) return route.fulfill(json({ words: [{ id: "visual-item-1", wordId: "visual-word-1", order: 1, inNotebook: false, progress: { status: "LEARNING" }, word: { id: "visual-word-1", word: "routine", phonetic: "/ruːˈtiːn/", partOfSpeech: "noun", meaningVi: "thói quen hằng ngày", meaningEn: "a usual way of doing things", example: "My morning routine helps me start the day well.", difficulty: 1, topic: { id: "visual-topic", name: "Daily life" }, synonyms: ["habit"] } }, { id: "visual-item-2", wordId: "visual-word-2", order: 2, progress: { status: "AVAILABLE" }, word: { id: "visual-word-2", word: "prepare", phonetic: "/prɪˈpeə(r)/", partOfSpeech: "verb", meaningVi: "chuẩn bị", example: "I prepare my bag before class.", difficulty: 1, topic: { id: "visual-topic", name: "Daily life" } } }] }));
      if (url.endsWith("/vocabulary/weekly-plan")) return route.fulfill(json({ days: [{ id: "visual-day", date: "2026-10-05", status: "IN_PROGRESS", dayOfWeek: 1, topic: { name: "Daily life" }, words: [] }] }));
      if (url.endsWith("/vocabulary/me/stats")) return route.fulfill(json({ totalWords: 84, learnedWords: 42, masteredWords: 28, reviewDue: 6, notebookWords: 12, testsTaken: 4, memoryRate: 67 }));
      if (url.endsWith("/vocabulary/review/suggestions")) return route.fulfill(json({ weakWords: [{ word: "schedule", wordId: "visual-review-1", meaningVi: "lịch trình" }, { word: "commute", wordId: "visual-review-2", meaningVi: "đi lại hằng ngày" }] }));
      if (url.endsWith("/vocabulary/notebook")) return route.fulfill(json([{ id: "visual-note", createdAt: "2026-10-05T00:00:00Z", word: { id: "visual-note-word", word: "habit", meaningVi: "thói quen" } }]));
      if (url.endsWith("/vocabulary/challenge/today")) return route.fulfill(json({ challengeId: "visual-challenge", type: "CHOICE", title: "Thử thách hôm nay", total: 3, prompt: "Chọn nghĩa đúng của từ routine", word: "routine" }));
      if (url.endsWith("/vocabulary/words/visual-word-1/relations")) return route.fulfill(json({ synonyms: ["habit"], antonyms: [], sameTopic: [] }));
      return route.fulfill(json({}));
    });
  }
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const vocabularyDiagnostics = [];
  if (path === "/vocabulary") {
    page.on("console", (message) => vocabularyDiagnostics.push("console:" + message.type() + ":" + message.text()));
    page.on("requestfailed", (request) => vocabularyDiagnostics.push("requestfailed:" + request.url() + ":" + (request.failure()?.errorText || "unknown")));
  }
  if (path === "/vocabulary") page.on("response", (response) => { if (response.url().includes("/vocabulary")) console.log("[visual:vocabulary]", response.status(), response.url()); });
  if (path === "/grammar") {
    const json = (body) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    await page.route(API + "/grammar/dashboard{,?*}", async (route) => route.fulfill(json({
      stats: { totalTopics: 18, totalLessons: 42, completedLessons: 16, averageScore: 86 },
      categories: [
        { id: "cat-1", slug: "thi", title: "Thì trong tiếng Anh", totalTopics: 5, totalLessons: 12, completedLessons: 6, progress: 50 },
        { id: "cat-2", slug: "cau", title: "Cấu trúc câu", totalTopics: 4, totalLessons: 10, completedLessons: 4, progress: 40 },
        { id: "cat-3", slug: "tu-loai", title: "Từ loại", totalTopics: 4, totalLessons: 9, completedLessons: 5, progress: 56 }
      ],
      topics: [
        { id: "topic-1", title: "Present Perfect", description: "Nói về trải nghiệm và kết quả đến hiện tại", level: "B1", category: "Thì", totalLessons: 4, completedLessons: 2, progress: 50 },
        { id: "topic-2", title: "First Conditional", description: "Diễn tả điều kiện có thể xảy ra", level: "B1", category: "Cấu trúc câu", totalLessons: 3, completedLessons: 1, progress: 33 },
        { id: "topic-3", title: "Relative Clauses", description: "Bổ sung thông tin cho danh từ", level: "B1", category: "Mệnh đề", totalLessons: 4, completedLessons: 0, progress: 0 }
      ],
      roadmap: { currentLevel: "B1", progress: 38, items: [
        { id: "road-1", title: "Present Perfect", total: 4, completed: 2, done: false, progress: 50 },
        { id: "road-2", title: "First Conditional", total: 3, completed: 1, done: false, progress: 33 },
        { id: "road-3", title: "Relative Clauses", total: 4, completed: 0, done: false, progress: 0 }
      ]},
      recentLessons: [{ id: "recent-1", title: "Present Perfect: cơ bản", topic: "Thì", status: "Đã học", score: 88 }],
      recommend: { title: "Ôn tập", description: "Tiếp tục Present Perfect để hoàn thành chủ điểm đang học." }
    })));
  }
  const dynamicSurface = ["/vocabulary", "/grammar", "/reading", "/listening", "/speaking", "/writing"].includes(path);
  const response = await page.goto(WEB + path, { waitUntil: dynamicSurface ? "domcontentloaded" : "networkidle", timeout: 45_000 });
  if (!response || response.status() >= 400) throw new Error(name + " navigation failed");
  if (page.url().includes("/login")) throw new Error(name + " redirected to login");
  await stabilizePage(page);
  if (path === "/vocabulary") {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    console.log("[visual:vocabulary:state]", JSON.stringify({ url: page.url(), bodyText: bodyText.slice(0, 2000), errors, diagnostics: vocabularyDiagnostics.slice(-50) }));
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 30_000 });
  }
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
