import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const localeDir = join(rootDir, "src", "i18n", "locales");
const locales = ["vi", "en", "zh", "de"];
const baseLocale = "vi";

function compileTsModule(sourcePath, outputPath) {
  const source = readFileSync(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  writeFileSync(outputPath, output);
}

function flatten(value, prefix = "") {
  const result = new Map();

  if (Array.isArray(value)) {
    result.set(prefix, { type: "array", value });
    value.forEach((item, index) => {
      const itemKey = prefix ? `${prefix}.${index}` : String(index);
      for (const entry of flatten(item, itemKey)) result.set(entry[0], entry[1]);
    });
    return result;
  }

  if (value && typeof value === "object") {
    result.set(prefix, { type: "object", value });
    for (const [key, child] of Object.entries(value)) {
      const childKey = prefix ? `${prefix}.${key}` : key;
      for (const entry of flatten(child, childKey)) result.set(entry[0], entry[1]);
    }
    return result;
  }

  result.set(prefix, { type: typeof value, value });
  return result;
}

function placeholders(value) {
  if (typeof value !== "string") return [];
  return [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

function sameList(a, b) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

const tempDir = mkdtempSync(join(tmpdir(), "lumiverse-i18n-"));

try {
  const dictionaries = {};

  for (const locale of locales) {
    const outputPath = join(tempDir, `${locale}.cjs`);
    compileTsModule(join(localeDir, `${locale}.ts`), outputPath);
    const imported = await import(pathToFileURL(outputPath).href);
    dictionaries[locale] = imported.default ?? imported;
  }

  const base = flatten(dictionaries[baseLocale]);
  const failures = [];

  for (const locale of locales) {
    const current = flatten(dictionaries[locale]);

    for (const [key, expected] of base.entries()) {
      if (!key) continue;
      const actual = current.get(key);

      if (!actual) {
        failures.push(`${locale}: missing key "${key}"`);
        continue;
      }

      if (actual.type !== expected.type) {
        failures.push(
          `${locale}: type mismatch at "${key}" (${actual.type} !== ${expected.type})`,
        );
        continue;
      }

      if (actual.type === "string") {
        if (actual.value.trim().length === 0) {
          failures.push(`${locale}: empty value at "${key}"`);
        }

        const expectedPlaceholders = placeholders(expected.value);
        const actualPlaceholders = placeholders(actual.value);
        if (!sameList(actualPlaceholders, expectedPlaceholders)) {
          failures.push(`${locale}: placeholder mismatch at "${key}"`);
        }
      }
    }

    for (const key of current.keys()) {
      if (key && !base.has(key)) {
        failures.push(`${locale}: extra key "${key}"`);
      }
    }
  }

  if (failures.length > 0) {
    console.error("i18n check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
