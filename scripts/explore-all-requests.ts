/**
 * Capture ALL network requests during a person search to find the API endpoint.
 * Run with: npx tsx scripts/explore-all-requests.ts
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

  // Capture every single request (skip images/fonts/css)
  const allRequests: Array<{ method: string; url: string; type: string; postData?: string }> = [];
  const allResponses: Array<{ url: string; status: number; contentType: string; body?: string }> = [];

  page.on("request", (req) => {
    const type = req.resourceType();
    if (!["image", "font", "stylesheet", "media"].includes(type)) {
      allRequests.push({
        method: req.method(),
        url: req.url(),
        type,
        postData: req.postData() ?? undefined,
      });
    }
  });

  page.on("response", async (resp) => {
    const type = resp.request().resourceType();
    if (!["image", "font", "stylesheet", "media"].includes(type)) {
      const ct = resp.headers()["content-type"] ?? "";
      let body: string | undefined;
      if (ct.includes("json") || ct.includes("text")) {
        try {
          body = (await resp.text()).slice(0, 600);
        } catch {
          // ignore
        }
      }
      allResponses.push({ url: resp.url(), status: resp.status(), contentType: ct, body });
    }
  });

  // Load page
  await page.goto(`${FN_BASE}/persons`, { waitUntil: "networkidle", timeout: 30000 });

  const beforeCount = allRequests.length;

  // Type and search
  const nameInput = await page.$('input[type="text"]');
  if (nameInput) {
    await nameInput.click();
    await nameInput.fill("Klimke");
  }

  const btn = await page.getByRole("button", { name: /Suchen/i });
  if (btn) await btn.click();

  await page.waitForTimeout(4000);

  // Print only NEW requests (after search)
  const newRequests = allRequests.slice(beforeCount);
  console.log(`\n=== ${newRequests.length} new requests after search ===`);
  for (const r of newRequests) {
    console.log(`  [${r.method}] ${r.url} (${r.type})`);
    if (r.postData) console.log(`    Body: ${r.postData.slice(0, 300)}`);
  }

  // Print responses for those requests
  const newUrls = new Set(newRequests.map((r) => r.url));
  const newResponses = allResponses.filter((r) => newUrls.has(r.url));
  console.log(`\n=== Responses ===`);
  for (const r of newResponses) {
    console.log(`  ${r.url} → ${r.status} (${r.contentType})`);
    if (r.body) console.log(`    ${r.body}`);
  }

  // Also check if results exist in page DOM
  const pageText = await page.evaluate(() => document.body.innerText.trim().slice(0, 2000));
  console.log("\n=== Page text after search (first 2000) ===\n", pageText);

  // Find all <a> tags that might be person links
  const allLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a")).map((a) => ({
      href: a.href,
      text: a.textContent?.trim().slice(0, 50),
    })).filter((l) => l.href && !l.href.includes("fn-erfolgsdaten.de/#") && l.href !== "https://www.fn-erfolgsdaten.de/")
  );
  console.log("\nAll non-home links on page:", allLinks.slice(0, 20));

  // Check for any clickable items that look like person rows
  const clickableItems = await page.evaluate(() => {
    const items = document.querySelectorAll('[class*="person"], [class*="result"], [class*="list-item"], [class*="row"], tr, [role="row"], [role="listitem"]');
    return Array.from(items).slice(0, 10).map((el) => ({
      tag: el.tagName,
      class: el.className,
      text: (el as HTMLElement).innerText.trim().slice(0, 80),
      href: (el as HTMLAnchorElement).href ?? null,
    }));
  });
  console.log("\nPotential person row elements:", clickableItems);

  // ── Click first result ──
  console.log("\n=== Clicking first result ===");
  const resultsBefore = allRequests.length;

  // Try to click on the first person name in the list
  try {
    await page.locator("text=Klimke").first().click();
    await page.waitForTimeout(3000);
  } catch {
    console.log("No clickable 'Klimke' text found");
  }

  const clickRequests = allRequests.slice(resultsBefore);
  console.log(`${clickRequests.length} requests after clicking:`);
  for (const r of clickRequests) {
    console.log(`  [${r.method}] ${r.url}`);
  }
  console.log("URL after click:", page.url());

  const clickText = await page.evaluate(() => document.body.innerText.trim().slice(0, 3000));
  console.log("\nPage text after click:\n", clickText);

  await browser.close();
  console.log("\n=== Done ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
