/**
 * Phase 0 — Capture API calls from persons/horses search forms
 * Run with: npx tsx scripts/explore-search.ts
 */

import { chromium, type Response, type Page } from "playwright";

const FN_BASE = "https://www.fn-erfolgsdaten.de";
const API_BASE = "results-proxy.blackhorse-one.com";

function listenForApi(page: Page): { calls: Array<{ url: string; body: unknown }> } {
  const calls: Array<{ url: string; body: unknown }> = [];
  page.on("response", async (resp: Response) => {
    const url = resp.url();
    if (url.includes(API_BASE)) {
      try {
        const body = await resp.json();
        calls.push({ url, body });
      } catch {
        calls.push({ url, body: null });
      }
    }
  });
  return { calls };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await ctx.newPage();
  const { calls } = listenForApi(page);

  // ── 1. Persons search ──
  console.log("=== Persons search: 'Mueller' ===");
  await page.goto(`${FN_BASE}/persons`, { waitUntil: "networkidle", timeout: 30000 });

  // Find the name input (label says "Name, Personennummer oder FEI ID")
  const nameLabel = await page.getByText("Name, Personennummer oder FEI ID");
  let nameInput = null;
  if (nameLabel) {
    // Get the associated input or the next input sibling
    nameInput = await page.$('input[type="text"]:first-of-type');
  }

  if (!nameInput) {
    nameInput = await page.$('input[type="text"]');
  }

  if (nameInput) {
    console.log("Found name input, typing...");
    await nameInput.click();
    await nameInput.fill("Mueller");
    await page.waitForTimeout(500);
  }

  // Click the "Suchen" button
  const searchBtn = await page.getByRole("button", { name: /Suchen/i });
  if (searchBtn) {
    console.log("Clicking Suchen...");
    await searchBtn.click();
    await page.waitForTimeout(3000);
  }

  // Print page content after search
  const text = await page.evaluate(() => document.body.innerText.trim().slice(0, 4000));
  console.log("Page after search:\n", text);

  // Print all API calls so far
  console.log("\nAPI calls captured so far:");
  for (const c of calls) {
    console.log(`  ${c.url}`);
    if (c.body) console.log("  ", JSON.stringify(c.body).slice(0, 500));
  }
  calls.length = 0;

  // Try clicking on a person result if any
  const personLinks = await page.$$("a[href*='/person/']");
  console.log(`\nPerson links found: ${personLinks.length}`);
  if (personLinks.length > 0) {
    const href = await personLinks[0].getAttribute("href");
    console.log("First person link:", href);

    await page.goto(`${FN_BASE}${href}`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);
    const profileText = await page.evaluate(() => document.body.innerText.trim().slice(0, 4000));
    console.log("\nPerson profile page:\n", profileText);

    console.log("\nAPI calls for person profile:");
    for (const c of calls) {
      console.log(`  ${c.url}`);
      if (c.body) console.log("  ", JSON.stringify(c.body).slice(0, 800));
    }
    calls.length = 0;
  }

  // ── 2. Horses search ──
  console.log("\n=== Horses search: 'Bella' ===");
  await page.goto(`${FN_BASE}/horses`, { waitUntil: "networkidle", timeout: 30000 });

  const horseInput = await page.$('input[type="text"]');
  if (horseInput) {
    await horseInput.click();
    await horseInput.fill("Bella");
    await page.waitForTimeout(500);
  }

  const horseSearchBtn = await page.getByRole("button", { name: /Suchen/i });
  if (horseSearchBtn) {
    await horseSearchBtn.click();
    await page.waitForTimeout(3000);
  }

  const horsePageText = await page.evaluate(() => document.body.innerText.trim().slice(0, 4000));
  console.log("Horses page after search:\n", horsePageText);

  console.log("\nAPI calls for horse search:");
  for (const c of calls) {
    console.log(`  ${c.url}`);
    if (c.body) console.log("  ", JSON.stringify(c.body).slice(0, 800));
  }
  calls.length = 0;

  // Try a horse link
  const horseLinks = await page.$$("a[href*='/horse/']");
  console.log(`\nHorse links found: ${horseLinks.length}`);
  if (horseLinks.length > 0) {
    const href = await horseLinks[0].getAttribute("href");
    console.log("First horse link:", href);
    await page.goto(`${FN_BASE}${href}`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);

    const horseProfileText = await page.evaluate(() => document.body.innerText.trim().slice(0, 4000));
    console.log("\nHorse profile page:\n", horseProfileText);

    console.log("\nAPI calls for horse profile:");
    for (const c of calls) {
      console.log(`  ${c.url}`);
      if (c.body) console.log("  ", JSON.stringify(c.body).slice(0, 800));
    }
  }

  // ── 3. Probe the API directly ──
  console.log("\n=== Direct API probe ===");
  const probeUrls = [
    "https://results-proxy.blackhorse-one.com/persons?name=Mueller",
    "https://results-proxy.blackhorse-one.com/persons/search?q=Mueller",
    "https://results-proxy.blackhorse-one.com/person/search?name=Mueller",
    "https://results-proxy.blackhorse-one.com/horses?name=Bella",
  ];

  for (const url of probeUrls) {
    try {
      const resp = await page.request.get(url, {
        headers: {
          Accept: "application/json",
          Origin: "https://www.fn-erfolgsdaten.de",
          Referer: "https://www.fn-erfolgsdaten.de/",
        },
      });
      const status = resp.status();
      let body = "";
      try {
        body = JSON.stringify(await resp.json()).slice(0, 500);
      } catch {
        body = (await resp.text()).slice(0, 200);
      }
      console.log(`  ${url} → ${status}: ${body}`);
    } catch (e: unknown) {
      console.log(`  ${url} → ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await browser.close();
  console.log("\n=== Done ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
