/**
 * Phase 0 — API endpoint discovery for fn-erfolgsdaten.de
 * Run with: npx tsx scripts/explore-api.ts
 */

import { chromium } from "playwright";

const FN_BASE = "https://www.fn-erfolgsdaten.de";
const API_BASE = "results-proxy.blackhorse-one.com";

async function captureApiCalls(
  page: import("playwright").Page,
  label: string,
  action: () => Promise<void>
): Promise<void> {
  const calls: string[] = [];
  const responses: Record<string, unknown> = {};

  const handler = async (resp: import("playwright").Response) => {
    const url = resp.url();
    if (url.includes(API_BASE)) {
      const method = resp.request().method();
      calls.push(`[${method}] ${url}`);
      try {
        const json = await resp.json();
        responses[url] = json;
      } catch {
        // not JSON
      }
    }
  };

  page.on("response", handler);
  await action();
  await page.waitForTimeout(3000);
  page.off("response", handler);

  console.log(`\n--- ${label} ---`);
  for (const call of calls) {
    console.log(" ", call);
    const url = call.replace(/^\[.*?\] /, "");
    if (responses[url]) {
      const json = JSON.stringify(responses[url], null, 2);
      console.log("    Response (first 1500 chars):", json.slice(0, 1500));
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await ctx.newPage();

  // Load once to init the app
  await page.goto(FN_BASE, { waitUntil: "networkidle", timeout: 30000 });

  // ── 1. Persons page ──
  await captureApiCalls(page, "Navigate to /persons", async () => {
    await page.goto(`${FN_BASE}/persons`, { waitUntil: "networkidle", timeout: 20000 });
  });

  // Print page content
  const personsText = await page.evaluate(() => document.body.innerText.trim().slice(0, 3000));
  console.log("\nPersons page visible text:\n", personsText);

  const personsInputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input")).map((el) => ({
      type: el.type,
      placeholder: el.placeholder,
      id: el.id,
      name: el.name,
    }))
  );
  console.log("\nInputs on /persons:", personsInputs);

  // ── 2. Search for a rider ──
  await captureApiCalls(page, "Search for rider 'Mueller'", async () => {
    const inputs = await page.$$("input");
    if (inputs.length > 0) {
      await inputs[0].click();
      await inputs[0].fill("Mueller");
      await page.waitForTimeout(2000);
    }
  });

  // Check for results
  const searchResults = await page.evaluate(() => {
    const items = document.querySelectorAll(
      '[class*="result"], [class*="suggestion"], [class*="list"] li, [class*="item"], tr, [role="listitem"], [role="option"]'
    );
    return Array.from(items)
      .map((el) => (el as HTMLElement).innerText.trim())
      .filter(Boolean)
      .slice(0, 20);
  });
  console.log("\nSearch results visible:", searchResults);

  // ── 3. Horses page ──
  await captureApiCalls(page, "Navigate to /horses", async () => {
    await page.goto(`${FN_BASE}/horses`, { waitUntil: "networkidle", timeout: 20000 });
  });

  const horsesText = await page.evaluate(() => document.body.innerText.trim().slice(0, 2000));
  console.log("\nHorses page visible text:\n", horsesText);

  // Search for a horse
  await captureApiCalls(page, "Search for horse 'Bella'", async () => {
    const inputs = await page.$$("input");
    if (inputs.length > 0) {
      await inputs[0].click();
      await inputs[0].fill("Bella");
      await page.waitForTimeout(2000);
    }
  });

  // ── 4. A specific show page ──
  await captureApiCalls(page, "Navigate to show/263133 (Aachen)", async () => {
    await page.goto(`${FN_BASE}/show/263133`, { waitUntil: "networkidle", timeout: 20000 });
  });

  const showText = await page.evaluate(() => document.body.innerText.trim().slice(0, 3000));
  console.log("\nShow page visible text:\n", showText);

  // ── 5. Results page ──
  await captureApiCalls(page, "Navigate to /results", async () => {
    await page.goto(`${FN_BASE}/results`, { waitUntil: "networkidle", timeout: 20000 });
  });

  const resultsText = await page.evaluate(() => document.body.innerText.trim().slice(0, 2000));
  console.log("\nResults page visible text:\n", resultsText);

  await browser.close();
  console.log("\n=== Done ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
