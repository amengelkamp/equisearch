/**
 * Capture GraphQL queries from person/horse profile pages.
 * Run with: npx tsx scripts/explore-profile.ts
 */

import { chromium } from "playwright";

const FN_BASE = "https://www.fn-erfolgsdaten.de";
const GRAPHQL_URL = "https://spectatorjudginga14295f70.hana.ondemand.com/andromeda-1.0.0/api/graph";

interface GraphQLCall {
  operationName: string;
  variables: unknown;
  query: string;
  responseBody: unknown;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await ctx.newPage();
  const gqlCalls: GraphQLCall[] = [];

  // Intercept GraphQL calls
  await page.route("**andromeda**/api/graph", async (route) => {
    const req = route.request();
    let bodyArr: unknown[] = [];
    try {
      bodyArr = JSON.parse(req.postData() ?? "[]");
      if (!Array.isArray(bodyArr)) bodyArr = [bodyArr];
    } catch {
      // ignore
    }

    const resp = await route.fetch();
    let respBody: unknown = null;
    try {
      respBody = await resp.json();
    } catch {
      // ignore
    }

    for (let i = 0; i < bodyArr.length; i++) {
      const op = bodyArr[i] as { operationName?: string; variables?: unknown; query?: string };
      const respItem = Array.isArray(respBody) ? respBody[i] : respBody;
      gqlCalls.push({
        operationName: op.operationName ?? "unknown",
        variables: op.variables,
        query: (op.query ?? "").slice(0, 300),
        responseBody: respItem,
      });
    }

    await route.fulfill({ response: resp });
  });

  // ── 1. Load Ingrid Klimke's profile ──
  console.log("=== Loading Ingrid Klimke profile ===");
  await page.goto(
    `${FN_BASE}/profile/person_01hge8nettfabatwqaecq9q89v/Ingrid%20Klimke`,
    { waitUntil: "networkidle", timeout: 30000 }
  );
  await page.waitForTimeout(3000);

  console.log(`\nGraphQL operations called (${gqlCalls.length} total):`);
  for (const call of gqlCalls) {
    console.log(`\n  [${call.operationName}]`);
    console.log(`  Variables:`, JSON.stringify(call.variables));
    const respStr = JSON.stringify(call.responseBody);
    console.log(`  Response (first 800):`, respStr.slice(0, 800));
  }
  gqlCalls.length = 0;

  // ── 2. Navigate to athlete results ──
  console.log("\n\n=== Athlete results tab ===");
  const resultsLink = await page.$("a[href*='/results']");
  if (resultsLink) {
    await resultsLink.click();
    await page.waitForTimeout(3000);
  } else {
    // Try navigating directly to athlete results
    await page.goto(
      `${FN_BASE}/profile/athlete_01hge8q4saff8b12scectaq8h4/results`,
      { waitUntil: "networkidle", timeout: 20000 }
    );
    await page.waitForTimeout(3000);
  }

  console.log(`GraphQL ops on results page (${gqlCalls.length}):`);
  for (const call of gqlCalls) {
    console.log(`\n  [${call.operationName}]`);
    console.log(`  Variables:`, JSON.stringify(call.variables));
    const respStr = JSON.stringify(call.responseBody);
    console.log(`  Response (first 1000):`, respStr.slice(0, 1000));
  }
  gqlCalls.length = 0;

  const pageText = await page.evaluate(() => document.body.innerText.trim().slice(0, 3000));
  console.log("\nResults page text:\n", pageText);

  // ── 3. Load a show page ──
  console.log("\n\n=== Show page 263133 ===");
  await page.goto(`${FN_BASE}/show/263133`, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(3000);

  console.log(`GraphQL ops on show page (${gqlCalls.length}):`);
  for (const call of gqlCalls) {
    console.log(`\n  [${call.operationName}]`);
    console.log(`  Variables:`, JSON.stringify(call.variables));
    const respStr = JSON.stringify(call.responseBody);
    console.log(`  Response (first 1000):`, respStr.slice(0, 1000));
  }
  gqlCalls.length = 0;

  // Try clicking on a class in the show page
  const showText = await page.evaluate(() => document.body.innerText.trim().slice(0, 2000));
  console.log("\nShow page text:\n", showText);

  // Click the first class link
  const classLinks = await page.$$("a[href*='/show/'][href*='/class/']");
  if (classLinks.length > 0) {
    const href = await classLinks[0].getAttribute("href");
    console.log("\nFirst class link:", href);
  }

  // Find any links in the show page
  const showLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]"))
      .map((a) => ({ text: (a as HTMLAnchorElement).textContent?.trim().slice(0, 40), href: (a as HTMLAnchorElement).href }))
      .filter((l) => l.href.includes("fn-erfolgsdaten") && !l.href.endsWith("fn-erfolgsdaten.de/"))
      .slice(0, 20)
  );
  console.log("\nLinks on show page:", showLinks);

  await browser.close();
  console.log("\n=== Done ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
