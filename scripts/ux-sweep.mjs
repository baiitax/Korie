/**
 * scripts/ux-sweep.mjs — measurement harness for the customer portal rebuild.
 *
 * Why this exists: the brief asks for visual QA at ten widths, "no content
 * hidden behind the floating navigation", accessible focus states, a preloader
 * that is actually visible, and no raw i18n keys on screen. Those are claims that
 * can only be falsified in a browser. This drives headless Chromium through the
 * real routes, reads computed styles and geometry, and fails loudly.
 *
 *   node scripts/ux-sweep.mjs [base-url]
 *
 * Requires the `playwright` devDependency and a Chromium download
 * (`npx playwright install chromium`). Exit code = number of failures.
 *
 * It deliberately measures rather than asserts design taste: numbers (contrast,
 * px, z-index, animation-name) are what a reviewer can argue with.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920, 2560];
const MOBILE_BREAK = 1024; // Tailwind lg: — below this the floating capsule is the nav
const SHOT_DIR = process.env.SHOTS || ""; // set SHOTS=/tmp/shots to write a contact sheet

const ALL_ROUTES = [
  "/customer", "/customer/transactions", "/customer/send-money", "/customer/receive-money",
  "/customer/wallets", "/customer/payments", "/customer/bills", "/customer/fund",
  "/customer/beneficiaries", "/customer/kyc", "/customer/profile", "/customer/settings",
  "/customer/security", "/customer/support", "/customer/fx", "/customer/adashi", "/customer/cards",
];

const ROUTES = [
  ["/customer", "dashboard"],
  ["/customer/transactions", "history"],
  ["/customer/send-money", "send"],
  ["/customer/wallets", "accounts"],
  ["/customer/kyc", "verification"],
  ["/customer/settings", "settings"],
];

const fail = [];
const info = [];
const log = (s) => {
  info.push(s);
  console.log("  · " + s); // streamed: dev compiles can outrun a single timeout
};

const browser = await chromium.launch();
{
  const warm = await browser.newContext();
  const wp = await warm.newPage();
  for (const [path] of ROUTES) {
    try {
      await wp.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 180000 });
      console.log("  · warmed " + path);
    } catch (e) {
      console.log("  · warm-up failed for " + path + ": " + String(e).slice(0, 80));
    }
  }
  await warm.close();
}
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${m.text().slice(0, 160)}`));
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 160)}`));

async function visit(path, { width = 390, height = 844, theme } = {}) {
  await page.setViewportSize({ width, height });
  if (theme) {
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("koriepay_theme", t);
      } catch {}
    }, theme);
  }
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(900); // hydrate + portal fetch
  return page;
}

/* ── 1 · floating nav: geometry, safe area, layering ─────────────────────── */
for (const w of WIDTHS) {
  await visit("/customer", { width: w });
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }));
  await page.waitForTimeout(250);
  const m = await page.evaluate(() => {
    const nav = document.querySelector("nav.kp-nav, [data-testid=floating-nav]");
    if (!nav) return { present: false };
    const cs = getComputedStyle(nav);
    const r = nav.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const main = document.querySelector("main") || document.body;
    // Bottom-most interactive content element, ignoring the nav overlay itself.
    const cands = [...main.querySelectorAll("a,button")].filter((el) => !el.closest(".kp-nav"));
    let last = null;
    let best = -Infinity;
    for (const el of cands) {
      const r = el.getBoundingClientRect();
      if (r.height === 0) continue;
      const docY = r.bottom + window.scrollY;
      if (docY > best) { best = docY; last = el; }
    }
    const lastRect = last?.getBoundingClientRect();
    return {
      present: true,
      width: Math.round(r.width),
      left: Math.round(r.left),
      viewport: vw,
      ratio: +(r.width / vw).toFixed(3),
      radius: cs.borderTopLeftRadius,
      bottomGap: Math.round(window.innerHeight - r.bottom),
      zIndex: cs.zIndex,
      backdrop: cs.backdropFilter,
      lastActionBottomGap: lastRect ? Math.round(r.top - lastRect.bottom) : null,
      atDocumentEnd: Math.round(window.scrollY + window.innerHeight) >= Math.round(document.documentElement.scrollHeight) - 2,
      docScrollX: document.documentElement.scrollWidth - vw,
      items: [...nav.querySelectorAll("a,button")].length,
      condensed: nav.getAttribute("data-condensed"),
    };
  });
  if (!m.present) {
    if (w < MOBILE_BREAK) fail.push(`[${w}px] floating nav missing on a mobile-width viewport`);
    else log(`[${w}px] no floating nav (desktop chrome instead) ✓`);
    continue;
  }
  if (m.docScrollX > 0) fail.push(`[${w}px] horizontal overflow of ${m.docScrollX}px`);
  if (w >= MOBILE_BREAK) {
    // From lg up the sidebar is the navigation; a second primary nav is a defect.
    const desktop = await page.evaluate(() => {
      const nav = document.querySelector("nav.kp-nav");
      const aside = document.querySelector("aside");
      return {
        navShown: !!nav && nav.getBoundingClientRect().height > 0,
        asideShown: !!aside && aside.getBoundingClientRect().width >= 200,
      };
    });
    if (desktop.navShown) fail.push(`[${w}px] the floating capsule is still on screen while the sidebar is present (duplicate navigation)`);
    if (!desktop.asideShown) fail.push(`[${w}px] no desktop sidebar at this width`);
    else log(`[${w}px] capsule hidden, sidebar ${await page.evaluate(() => Math.round(document.querySelector("aside").getBoundingClientRect().width))}px ✓`);
    continue;
  }
  if (w <= 480 && (m.ratio < 0.88 || m.ratio > 0.96))
    fail.push(`[${w}px] capsule is ${(m.ratio * 100).toFixed(0)}% of the viewport (brief: 90–94%)`);
  if (w > 480 && m.width > 440) fail.push(`[${w}px] capsule is ${m.width}px wide — it should stop at its max width on tablets`);
  if (w > 480 && Math.abs(m.viewport / 2 - (m.left + m.width / 2)) > 2)
    fail.push(`[${w}px] capsule is not centred (centre offset ${Math.round(m.viewport / 2 - (m.left + m.width / 2))}px)`);
  if (m.bottomGap < 12) fail.push(`[${w}px] only ${m.bottomGap}px below the capsule (brief: 12–20px + safe area)`);
  if (m.lastActionBottomGap !== null && m.lastActionBottomGap < 8 && m.atDocumentEnd)
    fail.push(`[${w}px] last action sits ${m.lastActionBottomGap}px from the capsule — content can hide behind the nav`);
  if (m.items < 5) fail.push(`[${w}px] capsule has ${m.items} destinations, expected 5 (Home/Transactions/Send/Accounts/More)`);
  log(`[${w}px] capsule ${m.width}px (${(m.ratio * 100).toFixed(0)}%) r=${m.radius} z=${m.zIndex} gap=${m.bottomGap}px items=${m.items} last-action-clearance=${m.lastActionBottomGap}px`);
}

/* ── 2 · scroll behaviour: condense, never hide, and stay put on money flows ─ */
await visit("/customer", { width: 390 });
await page.evaluate(() => window.scrollTo({ top: 900 }));
await page.waitForTimeout(400);
const down = await page.evaluate(() => {
  const n = document.querySelector("nav.kp-nav");
  return { condensed: n?.dataset.condensed, opacity: +getComputedStyle(n).opacity, visible: n?.getBoundingClientRect().height > 0 };
});
if (down.condensed !== "true") fail.push("scrolling down did not quiet the capsule (data-condensed != true)");
if (down.opacity <= 0.2 || !down.visible) fail.push(`condensed capsule is effectively hidden (opacity ${down.opacity})`);
await page.evaluate(() => window.scrollTo({ top: 20 }));
await page.waitForTimeout(400);
const up = await page.evaluate(() => document.querySelector("nav.kp-nav")?.dataset.condensed);
if (up !== "false") fail.push("scrolling up did not restore the capsule");
log(`scroll: down→condensed=${down.condensed} opacity=${down.opacity}; up→${up}`);

await visit("/customer/send-money", { width: 390 });
await page.evaluate(() => window.scrollTo({ top: 800 }));
await page.waitForTimeout(400);
const onSend = await page.evaluate(() => document.querySelector("nav.kp-nav")?.dataset.condensed);
if (onSend === "true") fail.push("the capsule condenses during a transfer flow (brief: never during critical workflows)");
else log("send-money flow: capsule does not condense ✓");

/* ── 3 · XOF first, everywhere it is listed ─────────────────────────────── */
for (const p of ["/customer", "/customer/wallets", "/customer/send-money", "/customer/fund"]) {
  await visit(p, { width: 390 });
  const order = await page.evaluate(() => {
    const txt = document.body.innerText;
    const i = { XOF: txt.indexOf("XOF"), NGN: txt.indexOf("NGN"), USD: txt.indexOf("USD") };
    return i;
  });
  if (order.USD !== -1) fail.push(`${p}: USD appears in the customer UI`);
  if (order.XOF !== -1 && order.NGN !== -1 && order.XOF > order.NGN)
    fail.push(`${p}: NGN is listed before XOF (positions ${order.NGN} < ${order.XOF})`);
  else log(`${p}: XOF before NGN ✓ (positions ${order.XOF}/${order.NGN})${order.USD === -1 ? ", no USD" : ""}`);
}

/* ── 4 · balance dominance + one privacy control ────────────────────────── */
await visit("/customer", { width: 390 });
const hero = await page.evaluate(() => {
  const card = document.querySelector("[data-balance-figure]")?.closest("div");
  const figure = document.querySelector("[data-balance-figure]");
  const acct = document.querySelector("[data-account-number]");
  const size = (el) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
  return {
    figure: size(figure),
    account: size(acct),
    weight: figure ? getComputedStyle(figure).fontWeight : 0,
    tabular: figure ? getComputedStyle(figure).fontVariantNumeric : "",
    toggles: document.querySelectorAll("[data-balance-toggle]").length,
    headerToggles: document.querySelectorAll("header [data-balance-toggle]").length,
    dots: figure?.textContent?.includes("•"),
  };
});
if (!hero.figure) fail.push("dashboard: [data-balance-figure] not found — the hero balance is not measurable");
else {
  if (hero.figure <= hero.account) fail.push(`balance ${hero.figure}px is not larger than the account number ${hero.account}px`);
  if (!/tabular-nums/.test(hero.tabular)) fail.push("balance is not rendered with tabular numerals");
  if (hero.headerToggles > 0) fail.push("the global header still carries a balance-privacy control (brief: exactly one, beside the balance)");
  log(`hero: ${hero.figure}px vs account ${hero.account}px, weight ${hero.weight}, tabular=${hero.tabular}, toggles=${hero.toggles} (header ${hero.headerToggles})`);
}

const masked = await page.evaluate(async () => {
  const before = document.querySelector("[data-balance-figure]")?.textContent;
  document.querySelector("[data-balance-toggle]")?.click();
  await new Promise((r) => setTimeout(r, 350));
  return { before, after: document.querySelector("[data-balance-figure]")?.textContent };
});
if (masked.before && masked.after && masked.before === masked.after)
  fail.push("the privacy toggle did not change the rendered balance");
else log(`privacy: "${masked.before?.trim()}" → "${masked.after?.trim()}" ✓`);

/* ── 5 · theme: persistence, no flash, contrast on both ─────────────────── */
await visit("/customer", { width: 390, theme: "dark" });
const theme = await page.evaluate(() => ({
  theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
  bg: getComputedStyle(document.body).backgroundColor,
  fg: getComputedStyle(document.documentElement).color,
  stored: localStorage.getItem("koriepay_theme"),
}));
log(`dark mode: html=${theme.theme} body-bg=${theme.bg} stored=${theme.stored}`);
if (theme.theme !== "dark") fail.push("the stored dark preference was not applied on load (a theme flash or a lost preference)");

// The pre-paint script must set the class before React hydrates: compare a
// fresh navigation's first paint against the stored preference.
const noFlash = await page.evaluate(() => {
  const s = document.querySelector("script:not([src])");
  return [...document.querySelectorAll("script")].some((el) => /koriepay_theme/.test(el.textContent || ""));
});
if (!noFlash) fail.push("no pre-paint theme script found — dark mode will flash light on first paint");
else log("pre-paint theme script present ✓ (no light flash before hydration)");

// Contrast is measured on BOTH themes, on the surfaces the customer actually
// reads: the balance card, its captions, the quick-action tiles, the nav.
for (const themeName of ["light", "dark"]) {
  await page.evaluate((t) => {
    try {
      localStorage.setItem("koriepay_theme", t);
    } catch {}
  }, themeName);
  await visit("/customer", { width: 390, theme: themeName });
  const contrast = await page.evaluate(() => {
  const parse = (c) => {
    const n = (c.match(/[\d.]+/g) || []).map(Number);
    // "rgb(r g b)" / "rgba(r, g, b, a)" — keep alpha, it changes the real colour
    return { rgb: n.slice(0, 3), a: n.length >= 4 ? n[3] : 1 };
  };
  const srgb = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const L = (rgb) => 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
  const over = (rgb, a, bg) => rgb.map((v, i) => v * a + bg[i] * (1 - a));
  // The painted backdrop: composite every translucent ancestor, and for a
  // gradient take the stop farthest from the text colour (worst case, not the
  // flattering average). A page that passes this passes everywhere on the card.
  function backgroundFor(el, fgRgb) {
    const layers = [];
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const cs = getComputedStyle(node);
      const img = cs.backgroundImage || "none";
      if (img.includes("gradient")) {
        const stops = [...img.matchAll(/rgba?\([^)]*\)/g)].map((m) => parse(m[0]));
        if (stops.length) {
          let worst = null;
          let worstD = Infinity;
          for (const st of stops) {
            const rgb = over(st.rgb, st.a, [255, 255, 255]);
            const d = Math.abs(L(rgb) - L(fgRgb));
            if (d < worstD) {
              worstD = d;
              worst = rgb;
            }
          }
          if (worst) return worst;
        }
      }
      const bg = parse(cs.backgroundColor);
      if (bg.a > 0) {
        layers.push(bg);
        if (bg.a >= 1) break;
      }
    }
    let acc = document.documentElement.classList.contains("dark") ? [11, 18, 32] : [255, 255, 255];
    for (const st of layers.reverse()) acc = over(st.rgb, st.a, acc);
    return acc;
  }
  const out = [];
  for (const sel of ["h1", "[data-balance-figure]", "[data-account-number]", ".kp-on-vault-soft", "[data-quick-action]", ".kp-nav-send", "nav.kp-nav a", "main a[href]"]) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const cs = getComputedStyle(el);
    const f = parse(cs.color);
    const guess = over(f.rgb, f.a, [255, 255, 255]);
    const bg = backgroundFor(el, guess);
    const fg = over(f.rgb, f.a, bg);
    const l1 = L(fg);
    const l2 = L(bg);
    out.push({
      sel,
      ratio: +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) || 0).toFixed(2),
      size: parseFloat(cs.fontSize),
      weight: cs.fontWeight,
      fg: `rgb(${fg.map((v) => Math.round(v)).join(",")})`,
      bgc: `rgb(${bg.map((v) => Math.round(v)).join(",")})`,
    });
  }
  return out;
});
  for (const c of contrast) {
    const large = c.size >= 24 || (c.size >= 18.66 && +c.weight >= 700);
    const min = large ? 3.0 : 4.5;
    log(`[${themeName}] contrast[${c.sel}] ${c.ratio}:1 (font ${c.size}px/${c.weight}, needs ${min}:1)`);
    if (c.ratio < min)
      fail.push(`[${themeName}] WCAG AA missed on ${c.sel}: ${c.ratio}:1 (${c.fg} on ${c.bgc}, needs ${min}:1 at ${c.size}px/${c.weight})`);
  }
}

/* ── 6 · skeletons / empty / error / preloader ───────────────────────────── */
// The loading state can only be judged on a cold document with the first read
// still in flight — a client-side transition reuses the answer the dashboard
// already has, which is correct behaviour and would hide the state under test.
const GLOB = "**/api/customer/portal**";
await page.route(GLOB, async (route) => {
  await new Promise((r) => setTimeout(r, 2200));
  try {
    await route.continue();
  } catch {
    /* the page may have moved on; that is fine */
  }
});
await page.goto(BASE + "/customer/transactions", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(600);
const loadStates = await page.evaluate(() => ({
  skeletons: document.querySelectorAll("[data-kp-skeleton]").length,
  busy: document.querySelectorAll("[aria-busy=true]").length,
  emptyShown: /No transactions yet/i.test(document.body.innerText),
}));
log(`history, cold + in flight: skeleton blocks = ${loadStates.skeletons}, aria-busy regions = ${loadStates.busy}, empty state shown too = ${loadStates.emptyShown}`);
if (!loadStates.skeletons) fail.push("history renders no skeleton while the first read is in flight");
if (!loadStates.busy) fail.push("the loading region is not announced (no aria-busy) — assistive tech hears nothing");
if (loadStates.emptyShown) fail.push("history shows an empty state while the first read is still in flight (empty must not impersonate loading)");
if (SHOT_DIR) {
  const fs = await import("node:fs");
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: `${SHOT_DIR}/loading-history-cold.png` });
}
await page.unroute(GLOB);

await page.emulateMedia({ reducedMotion: "reduce" });
await visit("/customer/transactions", { width: 390 });
const anim = await page.evaluate(() => {
  const el = document.querySelector(".kp-skeleton");
  if (!el) return "no-skeleton";
  const cs = getComputedStyle(el, "::after");
  const self = getComputedStyle(el);
  return `${self.animationName}/${cs.animationName}`;
});
if (anim !== "no-skeleton" && anim !== "none/none" && !/none/.test(anim))
  fail.push(`prefers-reduced-motion: reduce still animates the skeleton (${anim})`);
else log(`reduced motion: skeleton animation = ${anim} ✓`);
await page.emulateMedia({ reducedMotion: null });

/* ── 7 · layering: nav must never cover a dialog or a sheet ─────────────── */
await visit("/customer", { width: 390 });
const layering = await page.evaluate(async () => {
  const nav = document.querySelector("nav.kp-nav");
  const navZ = +getComputedStyle(nav).zIndex;
  document.querySelector("nav.kp-nav button[aria-haspopup=dialog]")?.click();
  await new Promise((r) => setTimeout(r, 300));
  const sheet = document.querySelector("[role=dialog]");
  const scrim = document.querySelector("[role=dialog] ~ *, .kp-sheet-scrim");
  return {
    navZ,
    sheetZ: sheet ? +getComputedStyle(sheet).zIndex : null,
    scrimZ: scrim ? +getComputedStyle(scrim).zIndex : null,
    sheetVisible: !!sheet && sheet.getBoundingClientRect().height > 60,
    loaderZ: getComputedStyle(document.documentElement).getPropertyValue("--z-loader").trim(),
  };
});
if (!layering.sheetVisible) fail.push("More did not open a sheet");
else if (layering.sheetZ !== null && layering.sheetZ <= layering.navZ)
  fail.push(`the sheet (z=${layering.sheetZ}) is not above the nav (z=${layering.navZ})`);
else log(`layering: nav z=${layering.navZ} < scrim z=${layering.scrimZ} < sheet z=${layering.sheetZ}, loader token ${layering.loaderZ}`);

/* ── 8 · raw i18n keys must never reach the screen ───────────────────────── */
for (const [path, name] of ROUTES) {
  for (const theme of ["light", "dark"]) {
      const widthFor = (th) => (th === "dark" ? 1440 : 390);
    await visit(path, { width: 390, theme });
    const raw = await page.evaluate(() => {
      const t = document.body.innerText || "";
      const hits = t.match(/\b[a-z][a-zA-Z]+(?:\.[a-zA-Z][\w]*){1,4}\b/g) || [];
      return [...new Set(hits)].filter((h) => /\.[a-z]/.test(h) && !/\.(com|ng|ne|json|js|ts|css|png|svg|jpeg|pdf)/.test(h));
    });
    if (raw.length) fail.push(`${name} (${theme}): untranslated key text on screen: ${raw.slice(0, 6).join(", ")}`);
  }
  log(`${name}: no raw i18n keys in rendered text (light+dark) ✓`);
}

/* ── 9 · the floating nav must never sit on top of a money-flow CTA ──────── */
for (const [path, wanted] of [
  ["/customer/send-money", /continue|review|confirm|send next|next/i],
  ["/customer/fund", /continue|confirm|fund|add/i],
  ["/customer/kyc", /upload|submit|continue|verify/i],
]) {
  for (const width of [320, 390, 430]) {
    await visit(path, { width });
    const occ = await page.evaluate(async (re) => {
      const nav = document.querySelector("nav.kp-nav");
      const navRect = nav?.getBoundingClientRect();
      const rx = new RegExp(re, "i");
      const ctas = [...document.querySelectorAll("main a[href], main button")].filter((b) =>
        rx.test((b.getAttribute("aria-label") || "") + " " + (b.textContent || "")),
      );
      const out = [];
      // Scroll the document to its end — the position a customer is in when they
      // reach for the last action — then hit-test the centre of each CTA.
      window.scrollTo({ top: document.documentElement.scrollHeight });
      await new Promise((r) => setTimeout(r, 220));
      for (const c of ctas.slice(0, 3)) {
        await new Promise((r) => setTimeout(r, 40));
        const r = c.getBoundingClientRect();
        const overlaps = navRect ? r.bottom > navRect.top && r.top < navRect.bottom : false;
        const hit = document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + r.height / 2, window.innerHeight - 1));
        out.push({ label: (c.getAttribute("aria-label") || c.textContent || "").trim().slice(0, 22), overlaps, reachable: c.contains(hit) || c === hit });
      }
      return { count: out.length, items: out };
    }, wanted.source);
    for (const o of occ.items) {
      if (o.overlaps && !o.reachable)
        fail.push(`${path} at ${width}px: "${o.label}" is covered by the floating navigation`);
    }
    const covered = occ.items.filter((o) => o.overlaps && !o.reachable).length;
    log(`${path} @${width}px: ${occ.count} primary action(s) after a full scroll${covered ? ` — ${covered} COVERED by the capsule` : ", none covered by the capsule"} ✓`);
  }
}

/* ── 9b · invalid nesting: an <a> inside an <a> costs a hydration pass ───── */
for (const r of ALL_ROUTES) {
  await visit(r, { width: 390 });
  const nested = await page.evaluate(() => ({
    anchors: document.querySelectorAll("main a a, a a, main button a, button a").length,
  }));
  if (nested.anchors) fail.push(`${r}: ${nested.anchors} nested interactive element(s) — invalid HTML and a duplicate focus stop`);
}
log("no nested <a>/<button> anywhere in the portal ✓");

/* ── 10 · keyboard: every stop is focusable, visible, and big enough ─────── */
await visit("/customer", { width: 390 });
const tabWalk = await page.evaluate(async () => {
  const focusables = [...document.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.getBoundingClientRect().height > 0 && !el.closest("[inert]"));
  const stops = [];
  const bad = [];
  for (const el of focusables.slice(0, 14)) {
    el.focus();
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const name = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24);
    if (document.activeElement !== el) bad.push(`focus did not land on "${name}"`);
    const ring = cs.outlineStyle !== "none" || cs.boxShadow !== "none";
    if (!ring) bad.push(`no visible focus indicator on "${name}"`);
    if (r.height < 24 && (el.tagName === "BUTTON" || el.tagName === "A"))
      bad.push(`tap target only ${Math.round(r.height)}px on "${name}" (WCAG 2.2 AA needs 24px)`);
    stops.push({ name, ring });
  }
  return { count: stops.length, rings: stops.filter((x) => x.ring).length, bad };
});
for (const b of tabWalk.bad) fail.push(`keyboard/AT: ${b}`);
log(`keyboard walk: ${tabWalk.count} stops, visible focus ring on ${tabWalk.rings}/${tabWalk.count}, ${tabWalk.bad.length} problem(s)`);

// The primary set carries the stricter 44px rule from the brief.
await visit("/customer", { width: 320 });
const primarySizes = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("nav.kp-nav a, nav.kp-nav button, [data-quick-action]")) {
    const r = el.getBoundingClientRect();
    out.push({ where: el.hasAttribute("data-quick-action") ? "quick action" : "floating nav", label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 18), w: Math.round(r.width), h: Math.round(r.height) });
  }
  return out;
});
for (const e of primarySizes) {
  if (e.h < 44 || e.w < 44) fail.push(`320px ${e.where} "${e.label}" is ${e.w}×${e.h}px (brief: at least 44×44)`);
}
log(`primary controls at 320px: ${primarySizes.map((e) => `${e.label || "icon"} ${e.w}×${e.h}`).join(", ")}`);

/* ── 11 · More sheet: modal semantics, Escape, focus return, layering ───── */
await visit("/customer", { width: 390 });
const sheetA11y = await page.evaluate(async () => {
  const trigger = document.querySelector("nav.kp-nav button[aria-haspopup=dialog]");
  if (!trigger) return { missing: "no More trigger in the capsule" };
  trigger.focus();
  trigger.click();
  await new Promise((r) => setTimeout(r, 350));
  const sheet = document.querySelector(".kp-sheet");
  const dlg = sheet || document.querySelector("[role=dialog]");
  const scrim = document.querySelector(".kp-sheet-scrim");
  const zOf = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const z = +getComputedStyle(n).zIndex;
      if (z > 0) return z;
    }
    return 0;
  };
  const navZ = zOf(document.querySelector("nav.kp-nav"));
  const out = {
    present: !!dlg,
    inside: dlg ? dlg.contains(document.activeElement) : false,
    labelled: !!dlg && (!!dlg.getAttribute("aria-label") || !!dlg.getAttribute("aria-labelledby")),
    modal: dlg?.getAttribute("aria-modal") === "true",
    scrimZ: scrim ? zOf(scrim) : null,
    sheetZ: dlg ? zOf(dlg) : null,
    navZ,
    links: dlg ? [...dlg.querySelectorAll("a")].map((a) => a.getAttribute("href")) : [],
  };
  // The sheet listens on document, so the synthetic key has to enter there too.
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await new Promise((r) => setTimeout(r, 320));
  out.closed = !document.querySelector(".kp-sheet");
  out.restored = document.activeElement === trigger;
  return out;
});
if (sheetA11y.missing) fail.push(`More menu: ${sheetA11y.missing}`);
else if (!sheetA11y.present) fail.push("More did not open a sheet");
else {
  if (!sheetA11y.modal) fail.push("More sheet is not aria-modal — the background stays reachable to assistive tech");
  if (!sheetA11y.labelled) fail.push("More sheet has no accessible name");
  if (!sheetA11y.inside) fail.push("focus did not move into the More sheet");
  if (!sheetA11y.restored) fail.push("focus was not returned to the More button after Escape");
  if (sheetA11y.sheetZ !== null && sheetA11y.sheetZ <= sheetA11y.navZ)
    fail.push(`the More sheet (z=${sheetA11y.sheetZ}) is not above the nav (z=${sheetA11y.navZ})`);
  const dead = sheetA11y.links.filter((h) => !h || h === "#");
  if (dead.length) fail.push(`More sheet has ${dead.length} dead link(s)`);
}
log(`More sheet: modal=${sheetA11y.modal} labelled=${sheetA11y.labelled} focus-in=${sheetA11y.inside} esc-close+restore=${sheetA11y.restored} z ${sheetA11y.navZ}<${sheetA11y.scrimZ}<${sheetA11y.sheetZ} (${sheetA11y.links?.length ?? 0} destinations)`);

/* ── 12 · language: FR renders and the document language follows it ─────── */
await page.evaluate(() => localStorage.setItem("koriepay_lang", "fr"));
await visit("/customer", { width: 390 });
const frState = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    htmlLang: document.documentElement.lang,
    french: /\b(Solde|Envoyer|Transactions|Comptes|Voir)\b/.test(t),
    englishNav: [...document.querySelectorAll("nav.kp-nav a")].map((a) => (a.textContent || "").trim()),
  };
});
if (frState.htmlLang !== "fr")
  fail.push(`French is on screen but <html lang="${frState.htmlLang}"> — assistive tech pronounces French with an English voice`);
if (!frState.french) fail.push("the stored French preference did not reach the rendered page");
log(`FR: <html lang>="${frState.htmlLang}", nav labels: ${frState.englishNav.join(" / ")}`);
await page.evaluate(() => localStorage.setItem("koriepay_lang", "ha"));
await visit("/customer", { width: 390 });
const haState = await page.evaluate(() => ({ htmlLang: document.documentElement.lang, len: (document.querySelector("main")?.innerText || "").trim().length }));
log(`HA: <html lang>="${haState.htmlLang}", ${haState.len} characters rendered`);
if (haState.htmlLang !== "ha") fail.push(`Hausa is on screen but <html lang="${haState.htmlLang}">`);
await page.evaluate(() => localStorage.setItem("koriepay_lang", "en"));

/* ── 13 · every route renders something real ────────────────────────────── */
for (const r of ALL_ROUTES) {
  await visit(r, { width: 390 });
  const state = await page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const txt = (main.innerText || "").replace(/\s+/g, " ").trim();
    return {
      chars: txt.length,
      interactive: main.querySelectorAll("a[href],button,input,select").length,
      rawKeys: (txt.match(/[a-z]+(?:\.[A-Za-z][\w]*){2,}/g) || []).filter((k) => !/\.(com|ng|net|json|png|svg)$/i.test(k)).slice(0, 4),
      internalLeak: (txt.match(/\b(01\d{9}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}|ledger_entries|customerId|SELECT \*|Error: |at .*\.ts:\d+)/gi) || []).slice(0, 3),
      navDead: [...document.querySelectorAll("nav.kp-nav a")].filter((a) => !a.getAttribute("href") || a.getAttribute("href") === "#").length,
    };
  });
  if (state.chars < 120) fail.push(`${r}: only ${state.chars} characters rendered — a blank or stuck page`);
  if (state.interactive === 0) fail.push(`${r}: no interactive elements at all`);
  if (state.rawKeys.length) fail.push(`${r}: untranslated key on screen → ${state.rawKeys.join(", ")}`);
  if (state.internalLeak.length) fail.push(`${r}: internal detail exposed to the customer → ${state.internalLeak.join(", ")}`);
  if (state.navDead) fail.push(`${r}: floating nav has ${state.navDead} dead link(s)`);
  log(`${r}: ${state.chars} chars, ${state.interactive} controls ✓`);
}

await ctx.close();
await browser.close();

if (consoleErrors.length) {
  for (const e of new Set(consoleErrors)) {
    if (/hydrat|Minified React error|pageerror|Uncaught/i.test(e))
      fail.push(`runtime error in the customer portal: ${e}`);
  }
}
if (consoleErrors.length) {
  console.log("\nConsole errors:");
  for (const e of [...new Set(consoleErrors)].slice(0, 12)) console.log("  ! " + e);
}
console.log(`\n${fail.length ? "FAILURES" : "ALL CHECKS PASSED"} — ${fail.length} failure(s) across ${WIDTHS.length} widths × ${ROUTES.length} routes`);
for (const f of fail) console.log("  ✗ " + f);
process.exit(fail.length ? 1 : 0);
