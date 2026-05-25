/**
 * Playwright UI debug script.
 * npx tsx scripts/playwright-debug.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";
const OUT = path.join(process.cwd(), "scripts/debug-screenshots");
fs.mkdirSync(OUT, { recursive: true });

async function shot(page: import("playwright").Page, name: string) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`  screenshot: ${name}.png`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console error] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[page error] ${err.message}`));

  // ── 1. Home page ─────────────────────────────────────────────────────────────
  console.log("\n1. Home page");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "01-home");
  console.log("  title:", await page.title());
  console.log("  h1:", await page.locator("h1").textContent());

  // ── 2. Rider search ──────────────────────────────────────────────────────────
  console.log("\n2. Rider search: 'Müller'");
  await page.fill("input[type=search]", "Müller");
  await page.waitForTimeout(600);
  await shot(page, "02-search-muller");
  const results = await page.locator("ul li").count();
  console.log(`  results shown: ${results}`);
  if (results > 0) {
    const first = await page.locator("ul li").first().textContent();
    console.log(`  first result: ${first?.trim()}`);
  }

  // ── 3. Umlaut fallback: 'Mueller' should also find Müller ────────────────────
  console.log("\n3. Umlaut fallback: 'Mueller'");
  await page.fill("input[type=search]", "Mueller");
  await page.waitForTimeout(600);
  await shot(page, "03-search-mueller");
  const muellerResults = await page.locator("ul li").count();
  console.log(`  results shown: ${muellerResults}`);

  // ── 4. Horse toggle ──────────────────────────────────────────────────────────
  console.log("\n4. Switch to horse search: 'Bella'");
  await page.locator("button", { hasText: "Pferd" }).click();
  await page.fill("input[type=search]", "Bella");
  await page.waitForTimeout(600);
  await shot(page, "04-search-bella-horse");
  const horseResults = await page.locator("ul li").count();
  console.log(`  results shown: ${horseResults}`);

  // ── 5. Rider profile page ────────────────────────────────────────────────────
  console.log("\n5. Rider profile page");
  await page.locator("button", { hasText: "Reiter" }).click();
  await page.fill("input[type=search]", "Müller");
  await page.waitForTimeout(600);
  const firstLink = page.locator("ul li a").first();
  const href = await firstLink.getAttribute("href");
  console.log(`  navigating to: ${href}`);
  await firstLink.click();
  await page.waitForLoadState("networkidle");
  await shot(page, "05-rider-profile");
  const tableRows = await page.locator("tbody tr").count();
  console.log(`  table rows: ${tableRows}`);
  const hasChart = await page.locator("svg").count() > 0;
  console.log(`  has chart: ${hasChart}`);

  // ── 6. Horse link from rider profile ─────────────────────────────────────────
  console.log("\n6. Horse link from rider profile");
  const horseLink = page.locator("tbody a").first();
  const horseLinkHref = await horseLink.getAttribute("href").catch(() => null);
  if (horseLinkHref) {
    console.log(`  navigating to: ${horseLinkHref}`);
    await horseLink.click();
    await page.waitForLoadState("networkidle");
    await shot(page, "06-horse-profile");
    const horseTableRows = await page.locator("tbody tr").count();
    console.log(`  table rows: ${horseTableRows}`);
  } else {
    console.log("  no horse link found (rider has no horse data)");
  }

  // ── 7. Short query (should show nothing / no error) ──────────────────────────
  console.log("\n7. Short query edge case: 'M' (< 2 chars threshold)");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.fill("input[type=search]", "M");
  await page.waitForTimeout(600);
  await shot(page, "07-short-query");
  const shortResults = await page.locator("ul li").count();
  const errorMsg = await page.locator("text=Fehler").count();
  console.log(`  results: ${shortResults}, error messages: ${errorMsg}`);

  // ── 8. No results ────────────────────────────────────────────────────────────
  console.log("\n8. No-results state: 'xyzxyzxyz'");
  await page.fill("input[type=search]", "xyzxyzxyz");
  await page.waitForTimeout(600);
  await shot(page, "08-no-results");
  const noResults = await page.locator("text=Keine Ergebnisse").count();
  console.log(`  'Keine Ergebnisse' shown: ${noResults > 0}`);

  // ── 9. 404 ───────────────────────────────────────────────────────────────────
  console.log("\n9. 404 page for unknown rider ID");
  await page.goto(`${BASE}/rider/nonexistent-id`, { waitUntil: "networkidle" });
  await shot(page, "09-404");
  console.log("  status url:", page.url());
  const notFoundText = await page.locator("body").textContent();
  console.log("  body snippet:", notFoundText?.trim().slice(0, 80));

  // ── 10. Mobile viewport ───────────────────────────────────────────────────────
  console.log("\n10. Mobile viewport (390x844)");
  await ctx.close();
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(BASE, { waitUntil: "networkidle" });
  await mobilePage.fill("input[type=search]", "Müller");
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: path.join(OUT, "10-mobile-search.png"), fullPage: true });
  console.log("  screenshot: 10-mobile-search.png");
  await mobileCtx.close();

  await browser.close();

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("\n── Error summary ──────────────────────────────────────────");
  if (errors.length === 0) {
    console.log("  No console errors or page errors.");
  } else {
    errors.forEach((e) => console.log(" ", e));
  }
  console.log(`\nScreenshots saved to: ${OUT}`);
}

main().catch(console.error);
