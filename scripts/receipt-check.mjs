/**
 * Completes a transfer through the real UI and opens the receipt modal,
 * dumping its text so raw i18n keys are visible if labels are missing.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "https://koriepayapp.vercel.app";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${BASE}/customer/send-money`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.selectOption("select", "058");
await page.fill('input[placeholder="0123456789"]', "0123456789");
const inputs = await page.locator("input[placeholder]").all();
for (const inp of inputs) {
  const ph = await inp.getAttribute("placeholder");
  if (ph && /recipient|name/i.test(ph) && ph !== "0123456789" && !/description/i.test(ph)) { await inp.fill("Evidence Check"); break; }
}
await page.fill('input[type="number"]', "5000");
await page.waitForTimeout(300);
await page.click('button[type="submit"]');
await page.waitForTimeout(800);
await page.click("text=Confirm");
await page.waitForTimeout(600);
const pin = page.locator('[role="dialog"] button', { hasText: /^\d$/ });
for (let i = 0; i < 4; i++) { await pin.nth(i % (await pin.count())).click(); await page.waitForTimeout(200); }
await page.waitForTimeout(3500);

await page.click("text=View Receipt");
await page.waitForTimeout(2000);
const txt = await page.evaluate(() => document.body.innerText);
const lines = txt.split("\n").filter((l) => l.trim());
console.log(lines.slice(0, 40).join("\n"));
await browser.close();
