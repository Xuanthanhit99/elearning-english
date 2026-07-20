import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const sourcePath = new URL("../src/lib/auth-redirect.ts", import.meta.url);
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const tempDir = mkdtempSync(join(tmpdir(), "lumiverse-auth-redirect-"));
const modulePath = join(tempDir, "auth-redirect.cjs");
writeFileSync(modulePath, compiled);

try {
  const {
    buildLoginUrl,
    isSafeRedirectPath,
    normalizeRedirectPath,
  } = await import(pathToFileURL(modulePath).href);

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
    "/auth?redirect=%2Fdashboard%3Ftab%3Dprogress%23week",
  );
  assert.equal(buildLoginUrl("https://evil.example"), "/auth");
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
