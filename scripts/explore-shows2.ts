/**
 * Trigger the shows search and capture queries + response.
 * Run with: npx tsx scripts/explore-shows2.ts
 */

import { chromium } from "playwright";

const FN_BASE = "https://www.fn-erfolgsdaten.de";
const GQL_URL = "https://spectatorjudginga14295f70.hana.ondemand.com/andromeda-1.0.0/api/graph";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await ctx.newPage();
  const bodies: string[] = [];
  const responses: Record<string, unknown> = {};

  await page.route("**andromeda**/api/graph", async (route) => {
    const body = route.request().postData() ?? "";
    bodies.push(body);
    const resp = await route.fetch();
    try { responses[body.slice(0, 50)] = await resp.json(); } catch { /* */ }
    await route.fulfill({ response: resp });
  });

  await page.goto(`${FN_BASE}/shows`, { waitUntil: "networkidle", timeout: 30000 });

  // Click the "Suche" button to trigger a search with default dates
  const searchBtn = await page.getByRole("button", { name: /Suche/i });
  if (searchBtn) {
    console.log("Clicking search...");
    await searchBtn.click();
    await page.waitForTimeout(4000);
  }

  const pageText = await page.evaluate(() => document.body.innerText.trim().slice(0, 4000));
  console.log("Page text after search:\n", pageText);

  console.log("\n=== GraphQL queries ===");
  for (const body of bodies) {
    try {
      const ops = JSON.parse(body);
      for (const op of (Array.isArray(ops) ? ops : [ops])) {
        console.log(`\n[${op.operationName}]`);
        console.log("Variables:", JSON.stringify(op.variables, null, 2));
        console.log("Query:", op.query);
        const respKey = body.slice(0, 50);
        if (responses[respKey]) {
          console.log("Response:", JSON.stringify(responses[respKey]).slice(0, 1000));
        }
      }
    } catch { /* */ }
  }
  bodies.length = 0;

  // Show links
  const showLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href*='/show/']"))
      .map((a) => ({ href: (a as HTMLAnchorElement).href, text: (a as HTMLAnchorElement).textContent?.trim().slice(0, 60) }))
      .slice(0, 15)
  );
  console.log("\nShow links:", showLinks);

  // Also try calling the API directly with a plausible shows query
  console.log("\n=== Direct API probe: FindShows ===");
  const probes = [
    { operationName: "FindShows", variables: { from: "2026-02-01", to: "2026-05-24", nation: "GER", page: 0 } },
    { operationName: "SearchShows", variables: { from: "2026-02-01", to: "2026-05-24", page: 0 } },
    { operationName: "GetShows", variables: { from: "2026-02-01", to: "2026-05-24" } },
    { operationName: "FindShowsForEh", variables: { from: "2026-02-01", to: "2026-05-24", page: 0 } },
  ];

  for (const probe of probes) {
    const resp = await page.request.post(GQL_URL, {
      headers: { "Content-Type": "application/json", Origin: FN_BASE, Referer: FN_BASE + "/" },
      data: JSON.stringify([{ ...probe, query: `query ${probe.operationName} { __typename }` }]),
    });
    const text = await resp.text();
    console.log(`[${probe.operationName}]`, text.slice(0, 200));
  }

  await browser.close();
  console.log("\n=== Done ===");
}

main().catch((e) => { console.error(e); process.exit(1); });
