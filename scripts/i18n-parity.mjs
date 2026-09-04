#!/usr/bin/env node
/**
 * KoriePay translation parity check (V7.0 §36).
 *
 * Verifies every translation key present in English also exists in French and
 * Hausa (and that no key is empty). The locale files are TypeScript objects,
 * so we transpile them on the fly with the installed TypeScript compiler and
 * import as ESM, then walk the nested tree.
 *
 * Exit 1 → gaps found (fail build). Exit 0 → full parity.
 *
 * Usage: node scripts/i18n-parity.mjs [--json]
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localeDir = path.resolve(__dirname, "../src/locales");
const langs = ["en", "fr", "ha"];
const json = process.argv.includes("--json");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kp-i18n-"));

function transpile(src, out) {
  const srcText = fs.readFileSync(src, "utf8");
  const js = ts.transpileModule(srcText, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
    fileName: src,
  }).outputText;
  fs.writeFileSync(out, js);
}

function collectKeys(obj, prefix = "") {
  const out = new Map();
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [nk, nv] of collectKeys(v, key)) out.set(nk, nv);
    } else {
      out.set(key, v);
    }
  }
  return out;
}

const dictionaries = {};
const refLang = "en";
for (const lang of langs) {
  const src = path.join(localeDir, `${lang}.ts`);
  if (!fs.existsSync(src)) {
    console.error(`✖ Missing locale file: ${lang}.ts`);
    process.exitCode = 1;
    continue;
  }
  const out = path.join(tmpDir, `${lang}.mjs`);
  transpile(src, out);
  const mod = await import(pathToFileURL(out).href);
  const dict = mod[lang] ?? mod.default?.[lang] ?? mod.default ?? mod;
  dictionaries[lang] = collectKeys(dict);
}

const ref = dictionaries[refLang] || new Map();
const gaps = [];
const empty = [];
for (const [key, val] of ref) {
  if (typeof val !== "string") continue;
  for (const lang of langs) {
    if (lang === refLang) continue;
    const other = dictionaries[lang]?.get(key);
    if (other === undefined) gaps.push({ key, missing: lang });
    else if (typeof other !== "string" || other.trim() === "") empty.push({ key, lang });
  }
}

if (json) {
  console.log(JSON.stringify({ reference: refLang, totalRefKeys: ref.size, gaps, empty }, null, 2));
} else if (gaps.length === 0 && empty.length === 0) {
  console.log(`✓ Translation parity OK — ${ref.size} English keys resolved in FR + HA with values.`);
} else {
  console.error(`✖ Translation parity gaps (${gaps.length} missing, ${empty.length} empty):`);
  for (const g of gaps) console.error(`   - ${g.key}  → missing in ${g.missing.toUpperCase()}`);
  for (const e of empty) console.error(`   - ${e.key}  → empty in ${e.lang.toUpperCase()}`);
}

fs.rmSync(tmpDir, { recursive: true, force: true });
if (gaps.length > 0 || empty.length > 0) process.exitCode = 1;
