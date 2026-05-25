import type Database from "better-sqlite3";
import { findShows, getShowMasterlist, loadCompetition } from "./api/client";
import type { AnyCompetition, DressageCompetitor, EventingCompetitor, JumpingCompetitor } from "./api/types";
import {
  upsertCompetition,
  upsertHorse,
  upsertPerson,
  upsertResult,
  upsertShow,
  isShowCrawled,
} from "./db";

const DELAY_MS = 1200;
const SUPPORTED_DISCIPLINES = new Set(["JUMPING", "DRESSAGE", "EVENTING"]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(msg: string) {
  process.stdout.write(`[crawler] ${msg}\n`);
}

// ── Result ingestion ─────────────────────────────────────────────────────────

type AnyCompetitor = JumpingCompetitor | DressageCompetitor | EventingCompetitor;

function getScore(comp: AnyCompetitor): { score: number | null; scoreUnit: string | null } {
  if ("resultOfficial" in comp && comp.resultOfficial != null) {
    return { score: comp.resultOfficial, scoreUnit: "%" };
  }
  return { score: null, scoreUnit: null };
}

function ingestCompetition(db: Database.Database, competition: AnyCompetition, showId: number) {
  const compId = parseInt(competition.id, 10);

  upsertCompetition(db, {
    id: compId,
    showId,
    name: competition.name,
    number: competition.number ?? null,
    discipline: competition.discipline,
    status: competition.status ?? null,
    instant: competition.zonedInstant?.instant ?? null,
  });

  let ingested = 0;
  for (const comp of competition.competitors as AnyCompetitor[]) {
    const person = comp.athlete?.person;
    if (!person?.apiId) continue;

    upsertPerson(db, {
      apiId: person.apiId,
      name: person.name,
      firstName: person.firstName ?? null,
      familyName: person.familyName ?? null,
      nationIoc: person.nation?.ioc ?? null,
    });

    if (comp.horse?.apiId) {
      upsertHorse(db, {
        apiId: comp.horse.apiId,
        name: comp.horse.name,
        bridleNumber: comp.horse.permanentBridleNumber ?? null,
        nationIoc: null,
      });
    }

    const { score, scoreUnit } = getScore(comp);

    upsertResult(db, {
      competitionId: compId,
      personApiId: person.apiId,
      horseApiId: comp.horse?.apiId ?? null,
      rankOfficial: comp.rankOfficial ?? null,
      placed: comp.placed,
      horsConcours: comp.horsConcours,
      status: comp.status,
      score,
      scoreUnit,
    });

    ingested++;
  }

  return ingested;
}

// ── Show crawling ────────────────────────────────────────────────────────────

export async function crawlShow(db: Database.Database, showId: number): Promise<number> {
  if (isShowCrawled(db, showId)) {
    log(`show ${showId} already crawled, skipping`);
    return 0;
  }

  const masterlist = await getShowMasterlist(showId);
  if (!masterlist) {
    log(`show ${showId} not found`);
    return 0;
  }

  const eligible = masterlist.competitions.filter(
    (c) =>
      SUPPORTED_DISCIPLINES.has(c.discipline) &&
      c.publishingStatus === "PUBLISHED_CONFIRMED" &&
      c.numberOfFinishedCompetitors > 0
  );

  log(`show ${showId} "${masterlist.name}" — ${eligible.length}/${masterlist.competitions.length} eligible competitions`);

  if (eligible.length === 0) return 0;

  // Only store the show once we know it has publishable results
  upsertShow(db, {
    id: masterlist.showId,
    name: masterlist.name,
    nationIoc: masterlist.nationIoc ?? null,
    firstDay: masterlist.firstDay ?? null,
    lastDay: masterlist.lastDay ?? null,
  });

  let totalResults = 0;
  for (const comp of eligible) {
    await delay(DELAY_MS);

    try {
      const competition = await loadCompetition(comp.id, comp.discipline);
      if (!competition) {
        log(`  competition ${comp.id} (${comp.discipline}) returned null`);
        continue;
      }

      const ingested = ingestCompetition(db, competition, masterlist.showId);
      totalResults += ingested;
      log(`  ${comp.discipline} ${comp.number} "${comp.name}" — ${ingested} results`);
    } catch (err: unknown) {
      log(`  competition ${comp.id} ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  log(`show ${showId} done — ${totalResults} results total`);
  return totalResults;
}

// ── Date-range crawling ──────────────────────────────────────────────────────

export async function crawlDateRange(
  db: Database.Database,
  from: string,
  to: string,
  options: { nationIoc?: string; maxShows?: number } = {}
) {
  const { nationIoc, maxShows = Infinity } = options;

  log(`fetching show list ${from} → ${to}${nationIoc ? ` (${nationIoc})` : ""}...`);

  let page = 0;
  let totalShows = 0;
  let crawledShows = 0;

  while (crawledShows < maxShows) {
    const result = await findShows(from, to, page, nationIoc);
    if (result.shows.length === 0) break;

    totalShows = result.totalElements;
    log(`page ${page + 1}/${result.totalPages} — ${result.shows.length} shows (${totalShows} total)`);

    for (const show of result.shows) {
      if (crawledShows >= maxShows) break;

      await delay(DELAY_MS);
      const ingested = await crawlShow(db, parseInt(show.id, 10));
      if (ingested > 0) crawledShows++;
    }

    if (page + 1 >= result.totalPages) break;
    page++;
  }

  log(`date-range crawl done — ${crawledShows} shows processed`);
}
