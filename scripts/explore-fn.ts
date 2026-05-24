/**
 * Phase 0 scraper exploration script.
 * Run with: npx tsx scripts/explore-fn.ts
 *
 * Goal: understand fn-erfolgsdaten.de's DOM, URL patterns, and data shape
 * by actually driving the browser and printing what we find.
 */

import { chromium } from "playwright";

const FN_URL = "https://www.fn-erfolgsdaten.de";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  // Log all network requests to find API endpoints
  const apiCalls: string[] = [];
  ctx.on("request", (req) => {
    const url = req.url();
    if (
      req.resourceType() === "fetch" ||
      req.resourceType() === "xhr" ||
      url.includes("/api/") ||
      url.includes(".json") ||
      url.includes("graphql")
    ) {
      apiCalls.push(`[${req.method()}] ${url}`);
    }
  });

  const page = await ctx.newPage();

  console.log("=== Step 1: Load homepage ===");
  await page.goto(FN_URL, { waitUntil: "networkidle", timeout: 30000 });
  console.log("URL after load:", page.url());
  console.log("Title:", await page.title());

  // Print all visible text to understand the page structure
  const bodyText = await page.evaluate(() => document.body.innerText.trim().slice(0, 2000));
  console.log("\nVisible text (first 2000 chars):\n", bodyText);

  // Print all links
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]"))
      .map((a) => ({ text: (a as HTMLAnchorElement).innerText.trim(), href: (a as HTMLAnchorElement).href }))
      .filter((l) => l.href && !l.href.startsWith("javascript"))
      .slice(0, 40)
  );
  console.log("\nAll links (first 40):");
  links.forEach((l) => console.log(` "${l.text}" → ${l.href}`));

  // Print all input fields
  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, select, textarea")).map((el) => ({
      tag: el.tagName,
      type: (el as HTMLInputElement).type || "",
      name: (el as HTMLInputElement).name || "",
      placeholder: (el as HTMLInputElement).placeholder || "",
      id: el.id || "",
    }))
  );
  console.log("\nAll form inputs:");
  inputs.forEach((i) => console.log(` <${i.tag} type="${i.type}" name="${i.name}" placeholder="${i.placeholder}" id="${i.id}">`));

  console.log("\n=== Step 2: Look for search functionality ===");

  // Look for a search input and try typing a rider name
  const searchInput = await page.$('input[type="text"], input[type="search"], input:not([type])');
  if (searchInput) {
    console.log("Found search input, typing 'Mueller'...");
    await searchInput.click();
    await searchInput.fill("Mueller");
    await page.waitForTimeout(2000);

    // Check for autocomplete suggestions
    const suggestions = await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="suggestion"], [class*="autocomplete"], [class*="dropdown"] li, [class*="result"] li');
      return Array.from(items).map((el) => (el as HTMLElement).innerText.trim()).slice(0, 20);
    });
    if (suggestions.length > 0) {
      console.log("Autocomplete suggestions:", suggestions);
    }
  } else {
    console.log("No text input found on homepage");
  }

  console.log("\n=== Step 3: Network API calls captured ===");
  if (apiCalls.length === 0) {
    console.log("No API/XHR/fetch calls detected");
  } else {
    apiCalls.forEach((c) => console.log(" ", c));
  }

  // Try navigating to common sub-paths
  console.log("\n=== Step 4: Try common sub-paths ===");
  const paths = ["/reiter", "/pferd", "/search", "/suche", "/rider", "/horse", "/results", "/ergebnisse"];
  for (const path of paths) {
    try {
      const resp = await page.goto(FN_URL + path, { timeout: 8000, waitUntil: "domcontentloaded" });
      const status = resp?.status();
      const title = await page.title();
      const url = page.url();
      console.log(`  ${path} → ${status} | title: "${title}" | url: ${url}`);
    } catch (e: unknown) {
      console.log(`  ${path} → ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await browser.close();

  console.log("\n=== Done ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
