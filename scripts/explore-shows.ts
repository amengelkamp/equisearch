/**
 * Capture the GraphQL query for listing shows.
 * Run with: npx tsx scripts/explore-shows.ts
 */

import { chromium } from "playwright";

const FN_BASE = "https://www.fn-erfolgsdaten.de";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await ctx.newPage();
  const bodies: string[] = [];

  await page.route("**andromeda**/api/graph", async (route) => {
    bodies.push(route.request().postData() ?? "");
    await route.continue();
  });

  // Navigate to shows page
  await page.goto(`${FN_BASE}/shows`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log("=== Shows page GraphQL queries ===");
  for (const body of bodies) {
    try {
      const ops = JSON.parse(body);
      for (const op of (Array.isArray(ops) ? ops : [ops])) {
        console.log(`\n[${op.operationName}]`);
        console.log("Variables:", JSON.stringify(op.variables, null, 2));
        console.log("Query:", op.query);
      }
    } catch {
      console.log("raw:", body.slice(0, 300));
    }
  }
  bodies.length = 0;

  const showsText = await page.evaluate(() => document.body.innerText.trim().slice(0, 3000));
  console.log("\nPage text:\n", showsText);

  // Check all links on shows page
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href*='/show/']"))
      .map((a) => ({ href: (a as HTMLAnchorElement).href, text: (a as HTMLAnchorElement).textContent?.trim().slice(0, 40) }))
      .slice(0, 30)
  );
  console.log("\nShow links found:", links.length);
  links.slice(0, 10).forEach((l) => console.log(" ", l));

  // Try interacting with filters — scroll down to load more
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  console.log("\n=== After scroll - new queries ===");
  for (const body of bodies) {
    try {
      const ops = JSON.parse(body);
      for (const op of (Array.isArray(ops) ? ops : [ops])) {
        console.log(`\n[${op.operationName}]`);
        console.log("Variables:", JSON.stringify(op.variables, null, 2));
        console.log("Query:", op.query?.slice(0, 600));
      }
    } catch {
      console.log("raw:", body.slice(0, 200));
    }
  }

  await browser.close();
  console.log("\n=== Done ===");
}

main().catch((e) => { console.error(e); process.exit(1); });
