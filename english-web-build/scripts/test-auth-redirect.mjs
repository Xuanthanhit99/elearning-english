import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const tempDir = mkdtempSync(join(tmpdir(), "lumiverse-auth-redirect-"));

function compileFixture(sourceFile, outputFile) {
  const sourcePath = new URL(sourceFile, import.meta.url);
  const source = readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  writeFileSync(join(tempDir, outputFile), compiled);
}

compileFixture("../src/lib/auth-redirect.ts", "auth-redirect.js");
compileFixture("../src/lib/auth-route-policy.ts", "auth-route-policy.js");

try {
  const {
    buildLoginUrl,
    isSafeRedirectPath,
    normalizeRedirectPath,
  } = await import(pathToFileURL(join(tempDir, "auth-redirect.js")).href);
  const { getAuthRouteDecision } = await import(
    pathToFileURL(join(tempDir, "auth-route-policy.js")).href
  );

  const valid = [
    "/dashboard",
    "/dashboard?tab=progress",
    "/profile",
    "/learning-path/abc",
    "/dashboard?tab=progress#week",
    "%2Fdashboard",
  ];

  for (const value of valid) {
    assert.equal(isSafeRedirectPath(value), true, `${value} should be safe`);
  }

  const invalid = [
    "https://evil.example",
    "http://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    "%252Fdashboard",
    "/login",
    "/auth/callback",
    "",
    undefined,
    "%E0%A4%A",
  ];

  for (const value of invalid) {
    assert.equal(isSafeRedirectPath(value), false, `${value} should be unsafe`);
    assert.equal(normalizeRedirectPath(value), "/dashboard");
  }

  assert.equal(
    buildLoginUrl("/dashboard?tab=progress#week"),
    "/login?redirect=%2Fdashboard%3Ftab%3Dprogress%23week",
  );
  assert.equal(buildLoginUrl("https://evil.example"), "/login");

  assert.deepEqual(
    getAuthRouteDecision({
      pathname: "/",
      search: "",
      isLoggedIn: false,
    }),
    { type: "next" },
    "guest opening / should see the public homepage",
  );

  assert.deepEqual(
    getAuthRouteDecision({
      pathname: "/",
      search: "",
      isLoggedIn: true,
    }),
    { type: "next" },
    "authenticated opening / should still see the public homepage",
  );

  assert.deepEqual(
    getAuthRouteDecision({
      pathname: "/dashboard",
      search: "",
      isLoggedIn: false,
    }),
    { type: "redirect", href: "/login?redirect=%2Fdashboard" },
    "guest opening /dashboard should go to login with safe redirect",
  );

  assert.deepEqual(
    getAuthRouteDecision({
      pathname: "/login",
      search: "",
      isLoggedIn: true,
    }),
    { type: "redirect", href: "/dashboard" },
    "login without redirect should default to dashboard",
  );

  assert.deepEqual(
    getAuthRouteDecision({
      pathname: "/login",
      search: "?redirect=/vocabulary",
      isLoggedIn: true,
    }),
    { type: "redirect", href: "/vocabulary" },
    "valid internal redirect should be preserved",
  );

  assert.deepEqual(
    getAuthRouteDecision({
      pathname: "/login",
      search: "?redirect=https%3A%2F%2Fevil.example",
      isLoggedIn: true,
    }),
    { type: "redirect", href: "/dashboard" },
    "malicious redirect should fall back to dashboard",
  );
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
