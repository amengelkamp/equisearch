import { loadDressageCompetition, loadJumpingCompetition } from "../src/lib/api/client";

async function main() {
  console.log("Testing dressage competition 4512336 (Meppen 2025)...");
  try {
    const result = await loadDressageCompetition("4512336");
    console.log("Result:", JSON.stringify(result, null, 2).slice(0, 1000));
  } catch (e) {
    console.error("ERROR:", (e as Error).message);
  }

  console.log("\nTesting jumping competition 4512355 (Meppen 2025)...");
  try {
    const result = await loadJumpingCompetition("4512355");
    console.log("Result:", JSON.stringify(result, null, 2).slice(0, 1000));
  } catch (e) {
    console.error("ERROR:", (e as Error).message);
  }

  // Also try the known working IDs from Phase 0
  console.log("\nTesting jumping competition 175537 (known working from Phase 0)...");
  try {
    const result = await loadJumpingCompetition("175537");
    console.log("Result:", JSON.stringify(result, null, 2).slice(0, 800));
  } catch (e) {
    console.error("ERROR:", (e as Error).message);
  }
}

main().catch(console.error);
