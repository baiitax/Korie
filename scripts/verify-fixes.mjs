/**
 * Post-fix verification: Adashi visibility, i18n interpolation, and the
 * full send-money flow (review numbers vs. actual balance movement).
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message.slice(0, 150)}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`CONSOLE: ${m.text().slice(0, 150)}`); });

const results = [];
const check = (name, ok, detail = "") => results.push(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);

// ── 1. Dashboard: Adashi tile + badge
await page.goto(`${BASE}/customer`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
let txt = await page.evaluate(() => document.body.innerText);
check("Dashboard shows Adashi service tile", /Adashi/.test(txt));
const tileTxt = await page.evaluate(() => {
  const l = document.querySelector('main a[href="/customer/adashi"]');
  return l ? l.innerText : "";
});
check("Adashi tile carries ACTIVE badge", /active/i.test(tileTxt) && !/adashi\./i.test(tileTxt));
await page.screenshot({ path: "/tmp/verify-dashboard.png" });

// Sidebar (lg+) — set a desktop viewport; services render in a second nav
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${BASE}/customer`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
txt = await page.evaluate(() => Array.from(document.querySelectorAll("nav")).map((n) => n.innerText).join(" | "));
check("Desktop sidebar lists Adashi", (txt.match(/Adashi/g) || []).length >= 1 && !/nav\.adashi/.test(txt));
await page.screenshot({ path: "/tmp/verify-sidebar.png" });
await page.setViewportSize({ width: 390, height: 844 });

// ── 2. FX page: {secs} interpolation
await page.goto(`${BASE}/customer/fx`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
txt = await page.evaluate(() => document.body.innerText);
check("FX countdown interpolated (no raw {secs})", /Rate expires in \d+s/.test(txt) && !/\{secs\}/.test(txt));
await page.screenshot({ path: "/tmp/verify-fx.png" });

// ── 3. Send-money flow: numbers + balance truth
await page.goto(`${BASE}/customer/send-money`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

const balanceBefore = await page.evaluate(() => {
  const m = document.body.innerText.match(/CFA ([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
});

// Fill: source XOF (default), bank = Providus (NGN) => cross-border
await page.selectOption("select", "058");
await page.fill('input[placeholder="0123456789"]', "0123456789");
const nameInputs = await page.locator('input[placeholder]').all();
for (const inp of nameInputs) {
  const ph = await inp.getAttribute("placeholder");
  if (ph && /recipient|name/i.test(ph) && ph !== "0123456789" && !/description/i.test(ph)) { await inp.fill("Musa Test"); break; }
}
await page.fill('input[type="number"]', "10000");
await page.waitForTimeout(400);
txt = await page.evaluate(() => document.body.innerText);
check("Form shows fee as included", /\(included\)|\(an haɗa\)/i.test(txt));
await page.screenshot({ path: "/tmp/verify-form.png" });

await page.click('button[type="submit"]');
await page.waitForTimeout(800);
txt = await page.evaluate(() => document.body.innerText);
const totalMatch = txt.match(/Total Amount to Debit\s*CFA\s*([\d,\.]+)/) || txt.match(/Total Debit\s*CFA\s*([\d,\.]+)/);
check("Review shows Total Debit = amount (not amount+fee)", totalMatch ? totalMatch[1].startsWith("10,000") : false, totalMatch ? totalMatch[1] : "row not found");
await page.screenshot({ path: "/tmp/verify-review.png" });

// Confirm via PIN modal (any 4 digits, scoped to the open dialog)
await page.click("text=Confirm");
await page.waitForTimeout(600);
const pinBtns = page.locator('[role="dialog"] button', { hasText: /^\d$/ });
for (let i = 0; i < 4; i++) { await pinBtns.nth(i % await pinBtns.count()).click(); await page.waitForTimeout(200); }
await page.waitForTimeout(3500);
txt = await page.evaluate(() => document.body.innerText);
check("Transfer completed", /successful|receipt/i.test(txt));
await page.screenshot({ path: "/tmp/verify-success.png" });

// Back to dashboard — balance must be exactly 10,000 lower
await page.goto(`${BASE}/customer`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
const balanceAfter = await page.evaluate(() => {
  const m = document.body.innerText.match(/CFA ([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
});
check("Balance dropped exactly the displayed Total Debit (10,000 CFA)",
  balanceBefore !== null && balanceAfter === balanceBefore - 10000,
  `${balanceBefore} → ${balanceAfter}`);

console.log(results.join("\n"));
console.log("\n=== runtime errors ===");
console.log(errors.join("\n") || "(none)");
await browser.close();
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
