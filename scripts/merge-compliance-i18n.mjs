#!/usr/bin/env node
/**
 * Merge flat `compliance` key maps into src/locales/<lang>.ts.
 *
 * Existing keys are left untouched (never overwritten); only absent leaf keys
 * are added. The namespace block is re-serialised, so the file stays valid
 * TypeScript and the diff stays reviewable.
 *
 * Usage: node scripts/merge-compliance-i18n.mjs <lang> <jsonFile> [more json files…]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const [, , lang, ...files] = process.argv;
if (!lang || files.length === 0) {
  console.error('usage: merge-compliance-i18n.mjs <lang> <json…>');
  process.exit(2);
}

const target = path.join(root, 'src/locales', `${lang}.ts`);
const src = fs.readFileSync(target, 'utf8');

/** Find `compliance: { … }` at any indent, skipping over string literals. */
function findBlock(text) {
  const match = /\n([ \t]*)compliance: \{/.exec(text);
  if (!match) throw new Error('compliance block not found');
  const start = match.index;
  findBlock.indent = match[1];
  const open = text.indexOf('{', start);
  let i = open;
  let depth = 0;
  let quote = null;
  while (i < text.length) {
    const c = text[i];
    const prev = text[i - 1];
    if (quote) {
      if (c === quote && prev !== '\\') quote = null;
    } else if (c === '"' || c === "'" || c === '`') {
      quote = c;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return { start: open, end: i + 1 };
    }
    i++;
  }
  throw new Error('unbalanced braces');
}

const block = findBlock(src);
const body = src.slice(block.start + 1, block.end - 1);
// eslint-disable-next-line no-eval
const obj = eval(`({${body}})`);

function setPath(target, parts, value) {
  let node = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
    node = node[key];
  }
  const leaf = parts[parts.length - 1];
  if (node[leaf] !== undefined) return 'kept';
  node[leaf] = value;
  return 'added';
}

let added = 0;
let kept = 0;
for (const file of files) {
  const map = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [key, value] of Object.entries(map)) {
    const outcome = setPath(obj, key.split('.'), value);
    if (outcome === 'added') added++;
    else kept++;
  }
}

function serialise(node, indent) {
  const pad = ' '.repeat(indent);
  const lines = [];
  for (const [key, value] of Object.entries(node)) {
    const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${pad}  ${safeKey}: {`);
      lines.push(serialise(value, indent + 2));
      lines.push(`${pad}  },`);
    } else {
      lines.push(`${pad}  ${safeKey}: ${JSON.stringify(value)},`);
    }
  }
  return lines.join('\n');
}

const pad = findBlock.indent ?? '';
const merged = `{\n${serialise(obj, pad.length + 2)}\n${pad}}`;
const out = src.slice(0, block.start) + merged + src.slice(block.end);
fs.writeFileSync(target, out);

const total = (function count(node) {
  return Object.values(node).reduce((sum, v) => sum + (v && typeof v === 'object' && !Array.isArray(v) ? count(v) : 1), 0);
})(obj);
console.log(`${lang}: +${added} keys, ${kept} already present, ${total} compliance keys total`);
