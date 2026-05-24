/**
 * Capture the FULL GraphQL query bodies and try replaying them directly.
 * Run with: npx tsx scripts/capture-queries.ts
 */

import { chromium } from "playwright";

const FN_BASE = "https://www.fn-erfolgsdaten.de";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await ctx.newPage();

  // Capture ALL GraphQL request bodies (no truncation)
  const capturedBodies: string[] = [];
  const capturedHeaders: Record<string, string>[] = [];

  await page.route("**andromeda**/api/graph", async (route) => {
    const req = route.request();
    const body = req.postData() ?? "";
    capturedBodies.push(body);
    capturedHeaders.push(req.headers());
    await route.continue();
  });

  // ── 1. Do a person search and capture the full query ──
  await page.goto(`${FN_BASE}/persons`, { waitUntil: "networkidle", timeout: 30000 });
  const nameInput = await page.$('input[type="text"]');
  if (nameInput) {
    await nameInput.click();
    await nameInput.fill("Klimke");
  }
  const btn = await page.getByRole("button", { name: /Suchen/i });
  if (btn) await btn.click();
  await page.waitForTimeout(3000);

  console.log("=== Person search GraphQL bodies ===");
  for (const body of capturedBodies) {
    const parsed = JSON.parse(body);
    console.log(JSON.stringify(parsed, null, 2));
  }
  console.log("\n=== Request headers (first) ===");
  console.log(JSON.stringify(capturedHeaders[0], null, 2));

  capturedBodies.length = 0;
  capturedHeaders.length = 0;

  // ── 2. Click on Ingrid Klimke ──
  console.log("\n=== Clicking Ingrid Klimke ===");
  try {
    await page.locator("text=Ingrid Klimke").first().click();
    await page.waitForTimeout(4000);
  } catch {
    console.log("Could not click Ingrid Klimke");
  }

  console.log("URL:", page.url());
  console.log("Bodies captured:");
  for (const body of capturedBodies) {
    try {
      const parsed = JSON.parse(body);
      for (const op of (Array.isArray(parsed) ? parsed : [parsed])) {
        console.log(`\n[${op.operationName}]`);
        console.log("Variables:", JSON.stringify(op.variables));
        console.log("Full query:\n", op.query);
      }
    } catch {
      console.log("raw:", body.slice(0, 500));
    }
  }
  capturedBodies.length = 0;

  // ── 3. Navigate to athlete results tab ──
  console.log("\n=== Athlete results links ===");
  const athleteLinks = await page.$$("a[href*='athlete_']");
  for (const link of athleteLinks.slice(0, 5)) {
    const href = await link.getAttribute("href");
    const text = await link.textContent();
    console.log(`  "${text?.trim()}" → ${href}`);
  }

  // Try clicking the results link for the athlete
  const athleteResultsLink = await page.$("a[href*='/results']");
  if (athleteResultsLink) {
    const href = await athleteResultsLink.getAttribute("href");
    console.log("Athlete results href:", href);

    await page.goto(`${FN_BASE}${href}`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(3000);

    console.log("URL after nav:", page.url());
    for (const body of capturedBodies) {
      try {
        const parsed = JSON.parse(body);
        for (const op of (Array.isArray(parsed) ? parsed : [parsed])) {
          console.log(`\n[${op.operationName}]`);
          console.log("Variables:", JSON.stringify(op.variables));
          console.log("Query:", op.query);
        }
      } catch {
        console.log("raw:", body.slice(0, 300));
      }
    }

    const pageText = await page.evaluate(() => document.body.innerText.trim().slice(0, 3000));
    console.log("\nPage text:\n", pageText);
  }
  capturedBodies.length = 0;

  // ── 4. Try the show "Reiter" tab ──
  console.log("\n\n=== Show 263133 Reiter tab ===");
  await page.goto(`${FN_BASE}/show/263133`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(2000);

  // Click "Reiter" tab
  try {
    await page.locator("text=Reiter").first().click();
    await page.waitForTimeout(3000);
  } catch {
    console.log("Could not click Reiter tab");
  }

  for (const body of capturedBodies) {
    try {
      const parsed = JSON.parse(body);
      for (const op of (Array.isArray(parsed) ? parsed : [parsed])) {
        console.log(`\n[${op.operationName}]`);
        console.log("Variables:", JSON.stringify(op.variables));
        console.log("Query:", op.query?.slice(0, 500));
      }
    } catch {
      console.log("raw:", body.slice(0, 300));
    }
  }

  const reiterText = await page.evaluate(() => document.body.innerText.trim().slice(0, 3000));
  console.log("\nReiter tab text:\n", reiterText);

  await browser.close();
  console.log("\n=== Done ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
