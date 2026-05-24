/**
 * Explore competition result pages and GraphQL queries used.
 * Run with: npx tsx scripts/explore-competition.ts
 */

import { chromium } from "playwright";

const FN_BASE = "https://www.fn-erfolgsdaten.de";

interface GqlCall {
  operationName: string;
  variables: unknown;
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
  const gqlCalls: GqlCall[] = [];
  const gqlBodies: Record<string, unknown> = {};

  await page.route("**andromeda**/api/graph", async (route) => {
    const req = route.request();
    let bodyArr: unknown[] = [];
    try {
      bodyArr = JSON.parse(req.postData() ?? "[]");
      if (!Array.isArray(bodyArr)) bodyArr = [bodyArr];
    } catch { /* ignore */ }

    const resp = await route.fetch();
    let respBody: unknown = null;
    try {
      respBody = await resp.json();
    } catch { /* ignore */ }

    for (let i = 0; i < bodyArr.length; i++) {
      const op = bodyArr[i] as { operationName?: string; variables?: unknown; query?: string };
      const respItem = Array.isArray(respBody) ? respBody[i] : respBody;
      gqlCalls.push({ operationName: op.operationName ?? "unknown", variables: op.variables, responseBody: respItem });
      const key = `${op.operationName ?? "unknown"}:${JSON.stringify(op.variables)}`;
      gqlBodies[key] = respItem;
    }

    await route.fulfill({ response: resp });
  });

  // ── 1. Competition result page (jumping) ──
  console.log("=== Competition result page: jumping/175537 ===");
  await page.goto(
    `${FN_BASE}/show/263133/competition/jumping/175537`,
    { waitUntil: "networkidle", timeout: 30000 }
  );
  await page.waitForTimeout(3000);

  const compText = await page.evaluate(() => document.body.innerText.trim().slice(0, 4000));
  console.log("Competition page text:\n", compText);

  console.log(`\nGraphQL ops (${gqlCalls.length}):`);
  for (const call of gqlCalls) {
    console.log(`\n  [${call.operationName}]`);
    console.log("  Variables:", JSON.stringify(call.variables));
    console.log("  Response:", JSON.stringify(call.responseBody).slice(0, 1200));
  }
  gqlCalls.length = 0;

  // ── 2. Try competition/dressage page ──
  console.log("\n\n=== Competition result page: dressage/141121 ===");
  await page.goto(
    `${FN_BASE}/show/263133/competition/dressage/141121`,
    { waitUntil: "networkidle", timeout: 20000 }
  );
  await page.waitForTimeout(3000);

  const dressText = await page.evaluate(() => document.body.innerText.trim().slice(0, 4000));
  console.log("Dressage competition text:\n", dressText);

  console.log(`\nGraphQL ops (${gqlCalls.length}):`);
  for (const call of gqlCalls) {
    console.log(`\n  [${call.operationName}]`);
    console.log("  Variables:", JSON.stringify(call.variables));
    console.log("  Response:", JSON.stringify(call.responseBody).slice(0, 1500));
  }
  gqlCalls.length = 0;

  // ── 3. Try calling the search GraphQL query directly via page.request ──
  console.log("\n\n=== Direct GraphQL: FindPersonsForEhV2 ===");
  const searchResp = await page.request.post(
    "https://spectatorjudginga14295f70.hana.ondemand.com/andromeda-1.0.0/api/graph",
    {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://www.fn-erfolgsdaten.de",
        "Referer": "https://www.fn-erfolgsdaten.de/",
      },
      data: JSON.stringify([
        {
          operationName: "FindPersonsForEhV2",
          variables: {
            term: "Klimke",
            filter: {
              isAthlete: true,
              isOwner: false,
              isJudge: false,
              isTrainer: false,
              isBreeder: false,
              wonMedal: false,
              exact: false,
              searchNrn: false,
            },
            order: "BEST",
            page: 0,
          },
          query: `query FindPersonsForEhV2($term: String, $filter: EhPersonFilter, $order: EhSearchOrder, $page: Int) {
            foundPersons(term: $term, filter: $filter, order: $order, page: $page) {
              persons {
                apiId
                name
                academicTitle
                nation { id ioc __typename }
                imageUrl
                athleteApiId
                __typename
              }
              __typename
            }
          }`,
        },
      ]),
    }
  );
  const searchJson = await searchResp.json();
  console.log("Direct API response:", JSON.stringify(searchJson).slice(0, 1500));

  // ── 4. Try GetPersonProfileData directly ──
  console.log("\n\n=== Direct GraphQL: GetPersonProfileData for Ingrid Klimke ===");
  const profileResp = await page.request.post(
    "https://spectatorjudginga14295f70.hana.ondemand.com/andromeda-1.0.0/api/graph",
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: "https://www.fn-erfolgsdaten.de",
        Referer: "https://www.fn-erfolgsdaten.de/",
      },
      data: JSON.stringify([
        {
          operationName: "GetPersonProfileData",
          variables: { apiId: "person_01hge8nettfabatwqaecq9q89v" },
          query: `query GetPersonProfileData($apiId: String!) {
            personProfileData(apiId: $apiId) {
              apiId name nation { ioc __typename } firstName deceased gender
              athleteApiId isTrainer isOwner isJudge isAthlete isBreeder
              overallResultCount hasDressageResults hasJumpingResults
              lastSuccessfulCompetitorsInImportantCompetitions {
                showName showId competitionId discipline placement instant score
                __typename
              }
              __typename
            }
          }`,
        },
      ]),
    }
  );
  const profileJson = await profileResp.json();
  console.log("Profile API response:", JSON.stringify(profileJson).slice(0, 1500));

  await browser.close();
  console.log("\n=== Done ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
