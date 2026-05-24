/**
 * Seed the database by crawling recent shows from fn-erfolgsdaten.de.
 *
 * Usage:
 *   npx tsx scripts/seed.ts                         # last 3 months, GER only
 *   npx tsx scripts/seed.ts --from 2026-01-01       # custom start date
 *   npx tsx scripts/seed.ts --max 10                # limit to 10 shows (testing)
 *   npx tsx scripts/seed.ts --show 263133           # crawl a single show by ID
 */

import fs from "fs";
import path from "path";
import { getDb, getStats } from "../src/lib/db";
import { crawlDateRange, crawlShow } from "../src/lib/crawler";

// Ensure data/ directory exists
fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };

  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  return {
    from: get("--from") ?? threeMonthsAgo.toISOString().slice(0, 10),
    to: get("--to") ?? today.toISOString().slice(0, 10),
    max: get("--max") ? parseInt(get("--max")!, 10) : undefined,
    show: get("--show") ? parseInt(get("--show")!, 10) : null,
  };
}

async function main() {
  const { from, to, max, show } = parseArgs();
  const db = getDb();

  const statsBefore = getStats(db);
  console.log("DB before:", statsBefore);

  if (show) {
    console.log(`Crawling single show: ${show}`);
    await crawlShow(db, show);
  } else {
    console.log(`Crawling shows from ${from} to ${to}${max ? ` (max ${max})` : ""}...`);
    await crawlDateRange(db, from, to, { nationIoc: "GER", maxShows: max });
  }

  const statsAfter = getStats(db);
  console.log("\nDB after:", statsAfter);
  console.log("New rows:", {
    shows: statsAfter.shows - statsBefore.shows,
    competitions: statsAfter.competitions - statsBefore.competitions,
    persons: statsAfter.persons - statsBefore.persons,
    horses: statsAfter.horses - statsBefore.horses,
    results: statsAfter.results - statsBefore.results,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
