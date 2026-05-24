/**
 * Debug what's in a show's masterlist.
 * npx tsx scripts/debug-show.ts
 */
import { getShowMasterlist } from "../src/lib/api/client";
import { findShows } from "../src/lib/api/client";

async function main() {
  // Check what shows come back for past 3 months
  console.log("=== Shows in past 3 months ===");
  const result = await findShows("2026-02-24", "2026-05-24", 0, "GER");
  console.log(`Total: ${result.totalElements}, pages: ${result.totalPages}`);
  result.shows.slice(0, 5).forEach((s) => console.log(` ${s.id} "${s.name}" ${s.firstDay} → ${s.lastDay}`));

  // Inspect first show's competitions
  const showId = result.shows[0]?.id;
  if (!showId) return;

  console.log(`\n=== Masterlist for show ${showId} ===`);
  const masterlist = await getShowMasterlist(showId);
  console.log(`Show: "${masterlist.name}" ${masterlist.firstDay}`);
  console.log(`Competitions (${masterlist.competitions.length} total):`);
  for (const c of masterlist.competitions.slice(0, 15)) {
    console.log(`  ${c.id} [${c.discipline}] "${c.name}" status=${c.status} publishingStatus=${c.publishingStatus} finished=${c.numberOfFinishedCompetitors}/${c.numberOfCompetitors}`);
  }

  // Also check a show from further back that might have results
  console.log("\n=== Shows in Jan-Mar 2026 ===");
  const older = await findShows("2026-01-01", "2026-03-15", 0, "GER");
  console.log(`Total: ${older.totalElements}`);
  older.shows.slice(0, 5).forEach((s) => console.log(` ${s.id} "${s.name}" ${s.firstDay}`));

  if (older.shows[0]) {
    const m2 = await getShowMasterlist(older.shows[0].id);
    console.log(`\nMasterlist for ${m2.name}:`);
    for (const c of m2.competitions.slice(0, 8)) {
      console.log(`  ${c.id} [${c.discipline}] status=${c.status} publishing=${c.publishingStatus} finished=${c.numberOfFinishedCompetitors}`);
    }
  }
}

main().catch(console.error);
