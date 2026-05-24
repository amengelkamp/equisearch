/**
 * Capture the FULL query for LoadPublicJumpingCompetition.
 * npx tsx scripts/capture-competition-query.ts
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

  await page.route("**andromeda**/api/graph", async (route) => {
    const body = route.request().postData() ?? "";
    const ops = JSON.parse(body) as Array<{ operationName?: string; variables?: unknown; query?: string }>;
    for (const op of (Array.isArray(ops) ? ops : [ops])) {
      if (op.operationName?.includes("Competition")) {
        console.log(`\n=== ${op.operationName} ===`);
        console.log("Variables:", JSON.stringify(op.variables, null, 2));
        console.log("FULL QUERY:\n", op.query);
      }
    }
    await route.continue();
  });

  // Navigate directly to a competition page
  await page.goto(
    `${FN_BASE}/show/263133/competition/jumping/175537`,
    { waitUntil: "networkidle", timeout: 30000 }
  );
  await page.waitForTimeout(2000);

  // Also dressage
  await page.goto(
    `${FN_BASE}/show/263133/competition/dressage/141121`,
    { waitUntil: "networkidle", timeout: 20000 }
  );
  await page.waitForTimeout(2000);

  await browser.close();
}

main().catch(console.error);
