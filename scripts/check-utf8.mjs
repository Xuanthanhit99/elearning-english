import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ignoredDirs = new Set([
  ".git",
  ".next",
  "backups",
  "build",
  "coverage",
  "dist",
  "docs",
  "generated",
  "node_modules",
  "out",
]);

const textExtensions = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".env",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".prisma",
  ".scss",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const mojibakePatterns = [
  /Ã[\u0080-\u00bf]/g,
  /Â[\u0080-\u00bf]/g,
  /Æ/g,
  /Ä[\u0080-\u009f\u2018\u2019]/g,
  /â[\u0080-\u009f\u20ac\u2018-\u2026]/g,
  /ðŸ/g,
  /ï¿½/g,
  /\uFFFD/g,
  /[\u0080-\u009f]/g,
];

function isTextFile(filePath) {
  const baseName = path.basename(filePath);
  return textExtensions.has(path.extname(filePath).toLowerCase()) || baseName.startsWith(".env");
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(entryPath);
    } else if (entry.isFile() && isTextFile(entryPath)) {
      yield entryPath;
    }
  }
}

const findings = [];

for (const filePath of walk(root)) {
  if (path.relative(root, filePath) === path.join("scripts", "check-utf8.mjs")) {
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (mojibakePatterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(line);
    })) {
      findings.push({
        file: path.relative(root, filePath),
        line: index + 1,
        text: line.trim(),
      });
    }
  });
}

if (findings.length > 0) {
  console.error("Potential UTF-8/mojibake issues found:");
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.text}`);
  }
  process.exit(1);
}

console.log("UTF-8/mojibake scan passed.");
