/**
 * scripts/ux-shots.mjs — contact sheet for the customer portal.
 *
 * The audit (`ux-sweep.mjs`) measures; this is for looking. It renders every
 * primary route at a phone and a desktop width, in both themes, so "quietly
 * premium, not a gaming interface" and the light-canonical / deliberate-dark
 * pairing can be judged as pictures instead of as claims.
 *
 *   SHOTS=/tmp/contact-sheet node scripts/ux-shots.mjs [base-url]
 *
 * A screenshot that is only described is not evidence: the sweep's numeric
 * checks are the gate, this is the artefact a reviewer opens.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const OUT = process.env.SHOTS || "/tmp/koriepay-ux-shots";
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ["home", "/customer"],
  ["transactions", "/customer/transactions"],
  ["send", "/customer/send-money"],
  ["accounts", "/customer/wallets"],
  ["verification", "/customer/kyc"],
  ["settings", "/customer/settings"],
  ["fund", "/customer/fund"],
];

const browser = await chromium.launch();
for (const theme of ["light", "dark"]) {
  for (const [name, path] of ROUTES) {
    for (const [w, h, tag] of [[390, 844, "mobile"], [1440, 900, "desktop"]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      await page.addInitScript(
        ([t, l]) => {
          try {
            localStorage.setItem("koriepay_theme", t);
            localStorage.setItem("koriepay_lang", l);
          } catch {
            /* private mode */
          }
        },
        [theme, process.env.LOCALE || "en"],
      );
      await page.goto(BASE + path, { waitUntil: "load", timeout: 120000 });
      // Real data, not a spinner: wait for the portal's first authoritative paint.
      await page.waitForTimeout(2200);
      const file = `${OUT}/${name}-${tag}-${theme}.png`;
      await page.screenshot({ path: file });
      console.log(`${file}  (${tag} ${w}px, ${theme})`);
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`\n${fs.readdirSync(OUT).filter((f) => f.endsWith(".png")).length} shots in ${OUT}`);
