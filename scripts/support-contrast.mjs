/**
 * scripts/support-contrast.mjs — WCAG 2.2 AA contrast measurement (§110).
 *
 * Reads the computed .kp-support design tokens in BOTH themes from the live
 * support portal and computes WCAG relative-luminance contrast ratios for the
 * pairs that carry real text. Fails (non-zero exit) when any pair drops below
 * 4.5:1 (normal text). Numbers, not taste: a reviewer can argue with a ratio.
 *
 *   node scripts/support-contrast.mjs [base-url]
 *
 * Requires the `playwright` devDependency and a Chromium download
 * (`npx playwright install chromium`).
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:3000";

const srgb = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const lum = (rgb) => {
  const [r, g, b] = rgb.map(srgb);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
/**
 * Parse "#rgb" | "#rrggbb" | "rgb(...)" | "rgba(...)" | "hsl(...)" |
 * "hsla(...)" → [r,g,b,a?]. Modern Chromium serializes some computed
 * color tokens in hsl(a) space, so both syntaxes must parse.
 */
const hslToRgb = (h, s, l) => {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
};
const parseColor = (raw) => {
  const c = (raw || "").trim().toLowerCase();
  if (c.startsWith("#")) {
    let h = c.slice(1);
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(/[\s,]+/).filter(Boolean).map(Number);
    return parts.length >= 4 ? parts.slice(0, 4) : parts.slice(0, 3);
  }
  const mh = c.match(/hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,|\/\s*)\s*([\d.]+%?)?\)/);
  if (mh) {
    const [r, g, b] = hslToRgb(parseFloat(mh[1]) / 360, parseFloat(mh[2]) / 100, parseFloat(mh[3]) / 100);
    const rgb = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    if (mh[4] !== undefined) {
      const a = mh[4].endsWith("%") ? parseFloat(mh[4]) / 100 : parseFloat(mh[4]);
      return [...rgb, a];
    }
    return rgb;
  }
  return null;
};
/** composite an rgba() layer over a solid background (soft chip over card) */
const compositeOver = (softRgba, bgRgb) =>
  softRgba.slice(0, 3).map((c, i) => Math.round(bgRgb[i] * (1 - softRgba[3]) + c * softRgba[3]));

/** Resolve a token pair to [textRgb, bgRgb] given the full token table. */
const resolvePair = (fgName, bgName, vars) => {
  const fgRaw = vars[fgName];
  const bgRaw = vars[bgName];
  if (!fgRaw || !bgRaw) return null;
  const fgRgb = parseColor(fgRaw);
  if (!fgRgb) return null;
  const bg = parseColor(bgRaw);
  if (!bg) return null;
  if (bg.length >= 4) {
    // soft rgba chip: composite over the card surface it sits on (glass-aware:
    // the card itself is an rgba layer over the page background)
    let over = parseColor(vars.cardBg) || parseColor(vars.surface) || parseColor(vars.background);
    if (over.length === 4) over = compositeOver(over, parseColor(vars.background) || [255, 255, 255]);
    return [fgRgb, compositeOver(bg, over.slice(0, 3))];
  }
  return [fgRgb, bg.slice(0, 3)];
};

/**
 * [label, foregroundToken, backgroundToken, min]
 * background "surface" means: composite the soft token over --card-bg.
 */
const PAIRS = [
  ["body text / background", "foreground", "background", 4.5],
  ["muted text / background", "muted1", "background", 4.5],
  ["secondary text / surface", "muted2", "surface", 4.5],
  ["brand button text", "brandOn", "brand", 4.5],
  ["badge text / brand soft", "brand", "brandSoft", 4.5],
  ["danger text / danger soft", "danger", "dangerSoft", 4.5],
  ["warning text / warning soft", "warning", "warningSoft", 4.5],
  ["success text / success soft", "success", "successSoft", 4.5],
  ["info text / info soft", "info", "infoSoft", 4.5],
];

const readVars = (page) =>
  page.evaluate(() => {
    // tokens are scoped to the portal root (.kp-support), not :root
    const root = document.querySelector(".kp-support") || document.documentElement;
    const get = (name) => getComputedStyle(root).getPropertyValue(name).trim();
    return {
      background: get("--background"),
      surface: get("--surface"),
      cardBg: get("--card-bg"),
      foreground: get("--foreground"),
      muted1: get("--foreground-muted"),
      muted2: get("--muted"),
      brand: get("--brand-primary"),
      brandSoft: get("--brand-soft"),
      brandOn: get("--brand-on-primary"),
      danger: get("--state-danger"),
      dangerSoft: get("--state-danger-soft"),
      warning: get("--state-warning"),
      warningSoft: get("--state-warning-soft"),
      success: get("--state-success"),
      successSoft: get("--state-success-soft"),
      info: get("--state-info"),
      infoSoft: get("--state-info-soft"),
    };
  });

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.goto(BASE + "/support", { waitUntil: "networkidle" });

let failures = 0;
const check = (theme, vars) => {
  console.log(`== ${theme} ==`);
  for (const [label, fg, bg, min] of PAIRS) {
    const resolved = resolvePair(fg, bg, vars);
    if (!resolved) {
      console.log(`  MISSING token ${fg}/${bg}`);
      failures += 1;
      continue;
    }
    const [fgRgb, bgRgb] = resolved;
    const r = ratio(fgRgb, bgRgb);
    const ok = r >= min;
    if (!ok) failures += 1;
    console.log(`  ${r.toFixed(2)}:1 ${ok ? "ok  " : "FAIL"} ${label} (min ${min}:1)`);
  }
};

check("LIGHT", await readVars(page));
await page.evaluate(() => document.documentElement.classList.add("dark"));
await page.waitForTimeout(200);
check("DARK", await readVars(page));

await browser.close();
console.log(failures === 0 ? "Contrast: PASS" : `Contrast: ${failures} failure(s)`);
process.exit(failures);
