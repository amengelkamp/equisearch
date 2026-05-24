import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "equi-score.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shows (
      id         INTEGER PRIMARY KEY,
      name       TEXT    NOT NULL,
      nation_ioc TEXT,
      first_day  TEXT,
      last_day   TEXT,
      crawled_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS competitions (
      id          INTEGER PRIMARY KEY,
      show_id     INTEGER NOT NULL REFERENCES shows(id),
      name        TEXT    NOT NULL,
      number      TEXT,
      discipline  TEXT    NOT NULL,
      status      TEXT,
      instant     TEXT,
      crawled_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS persons (
      api_id      TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      first_name  TEXT,
      family_name TEXT,
      nation_ioc  TEXT
    );

    CREATE TABLE IF NOT EXISTS horses (
      api_id         TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      bridle_number  TEXT,
      nation_ioc     TEXT
    );

    CREATE TABLE IF NOT EXISTS results (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id   INTEGER NOT NULL REFERENCES competitions(id),
      person_api_id    TEXT    NOT NULL REFERENCES persons(api_id),
      horse_api_id     TEXT    REFERENCES horses(api_id),
      rank_official    INTEGER,
      placed           INTEGER NOT NULL DEFAULT 0,
      hors_concours    INTEGER NOT NULL DEFAULT 0,
      status           TEXT    NOT NULL DEFAULT 'FINISHED',
      score            REAL,
      score_unit       TEXT,
      UNIQUE(competition_id, person_api_id, horse_api_id)
    );

    CREATE INDEX IF NOT EXISTS idx_results_person    ON results(person_api_id);
    CREATE INDEX IF NOT EXISTS idx_results_horse     ON results(horse_api_id);
    CREATE INDEX IF NOT EXISTS idx_results_comp      ON results(competition_id);
    CREATE INDEX IF NOT EXISTS idx_persons_name      ON persons(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_horses_name       ON horses(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_competitions_show ON competitions(show_id);
    CREATE INDEX IF NOT EXISTS idx_shows_first_day   ON shows(first_day);
  `);
}

// ── Upserts ──────────────────────────────────────────────────────────────────

export function upsertShow(db: Database.Database, show: {
  id: number;
  name: string;
  nationIoc: string | null;
  firstDay: string | null;
  lastDay: string | null;
}) {
  db.prepare(`
    INSERT INTO shows (id, name, nation_ioc, first_day, last_day, crawled_at)
    VALUES (@id, @name, @nationIoc, @firstDay, @lastDay, @crawledAt)
    ON CONFLICT(id) DO UPDATE SET
      name       = excluded.name,
      nation_ioc = excluded.nation_ioc,
      first_day  = excluded.first_day,
      last_day   = excluded.last_day,
      crawled_at = excluded.crawled_at
  `).run({ ...show, crawledAt: Date.now() });
}

export function upsertCompetition(db: Database.Database, comp: {
  id: number;
  showId: number;
  name: string;
  number: string | null;
  discipline: string;
  status: string | null;
  instant: string | null;
}) {
  db.prepare(`
    INSERT INTO competitions (id, show_id, name, number, discipline, status, instant, crawled_at)
    VALUES (@id, @showId, @name, @number, @discipline, @status, @instant, @crawledAt)
    ON CONFLICT(id) DO UPDATE SET
      name       = excluded.name,
      discipline = excluded.discipline,
      status     = excluded.status,
      instant    = excluded.instant,
      crawled_at = excluded.crawled_at
  `).run({ ...comp, crawledAt: Date.now() });
}

export function upsertPerson(db: Database.Database, person: {
  apiId: string;
  name: string;
  firstName: string | null;
  familyName: string | null;
  nationIoc: string | null;
}) {
  db.prepare(`
    INSERT INTO persons (api_id, name, first_name, family_name, nation_ioc)
    VALUES (@apiId, @name, @firstName, @familyName, @nationIoc)
    ON CONFLICT(api_id) DO UPDATE SET
      name        = excluded.name,
      first_name  = excluded.first_name,
      family_name = excluded.family_name,
      nation_ioc  = excluded.nation_ioc
  `).run(person);
}

export function upsertHorse(db: Database.Database, horse: {
  apiId: string;
  name: string;
  bridleNumber: string | null;
  nationIoc: string | null;
}) {
  db.prepare(`
    INSERT INTO horses (api_id, name, bridle_number, nation_ioc)
    VALUES (@apiId, @name, @bridleNumber, @nationIoc)
    ON CONFLICT(api_id) DO UPDATE SET
      name          = excluded.name,
      bridle_number = excluded.bridle_number
  `).run(horse);
}

export function upsertResult(db: Database.Database, result: {
  competitionId: number;
  personApiId: string;
  horseApiId: string | null;
  rankOfficial: number | null;
  placed: boolean;
  horsConcours: boolean;
  status: string;
  score: number | null;
  scoreUnit: string | null;
}) {
  db.prepare(`
    INSERT INTO results
      (competition_id, person_api_id, horse_api_id, rank_official, placed, hors_concours, status, score, score_unit)
    VALUES
      (@competitionId, @personApiId, @horseApiId, @rankOfficial, @placed, @horsConcours, @status, @score, @scoreUnit)
    ON CONFLICT(competition_id, person_api_id, horse_api_id) DO UPDATE SET
      rank_official = excluded.rank_official,
      placed        = excluded.placed,
      hors_concours = excluded.hors_concours,
      status        = excluded.status,
      score         = excluded.score,
      score_unit    = excluded.score_unit
  `).run({
    ...result,
    placed: result.placed ? 1 : 0,
    horsConcours: result.horsConcours ? 1 : 0,
  });
}

// ── Queries ──────────────────────────────────────────────────────────────────

export interface SearchResultRow {
  person_name: string;
  person_api_id: string;
  horse_name: string | null;
  horse_api_id: string | null;
  show_name: string;
  show_id: number;
  first_day: string | null;
  competition_name: string;
  competition_id: number;
  discipline: string;
  rank_official: number | null;
  placed: number;
  hors_concours: number;
  status: string;
  score: number | null;
  score_unit: string | null;
}

export function searchByRider(db: Database.Database, name: string, limit = 200): SearchResultRow[] {
  return db.prepare(`
    SELECT
      p.name          AS person_name,
      p.api_id        AS person_api_id,
      h.name          AS horse_name,
      h.api_id        AS horse_api_id,
      s.name          AS show_name,
      s.id            AS show_id,
      s.first_day,
      c.name          AS competition_name,
      c.id            AS competition_id,
      c.discipline,
      r.rank_official,
      r.placed,
      r.hors_concours,
      r.status,
      r.score,
      r.score_unit
    FROM results r
    JOIN persons     p ON p.api_id   = r.person_api_id
    LEFT JOIN horses h ON h.api_id   = r.horse_api_id
    JOIN competitions c ON c.id      = r.competition_id
    JOIN shows        s ON s.id      = c.show_id
    WHERE p.name LIKE '%' || @name || '%' COLLATE NOCASE
    ORDER BY s.first_day DESC
    LIMIT @limit
  `).all({ name, limit }) as SearchResultRow[];
}

export function searchByHorse(db: Database.Database, name: string, limit = 200): SearchResultRow[] {
  return db.prepare(`
    SELECT
      p.name          AS person_name,
      p.api_id        AS person_api_id,
      h.name          AS horse_name,
      h.api_id        AS horse_api_id,
      s.name          AS show_name,
      s.id            AS show_id,
      s.first_day,
      c.name          AS competition_name,
      c.id            AS competition_id,
      c.discipline,
      r.rank_official,
      r.placed,
      r.hors_concours,
      r.status,
      r.score,
      r.score_unit
    FROM results r
    JOIN persons     p ON p.api_id   = r.person_api_id
    JOIN horses      h ON h.api_id   = r.horse_api_id
    JOIN competitions c ON c.id      = r.competition_id
    JOIN shows        s ON s.id      = c.show_id
    WHERE h.name LIKE '%' || @name || '%' COLLATE NOCASE
    ORDER BY s.first_day DESC
    LIMIT @limit
  `).all({ name, limit }) as SearchResultRow[];
}

export function isShowCrawled(db: Database.Database, showId: number): boolean {
  const row = db.prepare("SELECT crawled_at FROM shows WHERE id = ?").get(showId) as { crawled_at: number } | undefined;
  return !!row;
}

export function getStats(db: Database.Database) {
  return {
    shows: (db.prepare("SELECT COUNT(*) AS n FROM shows").get() as { n: number }).n,
    competitions: (db.prepare("SELECT COUNT(*) AS n FROM competitions").get() as { n: number }).n,
    persons: (db.prepare("SELECT COUNT(*) AS n FROM persons").get() as { n: number }).n,
    horses: (db.prepare("SELECT COUNT(*) AS n FROM horses").get() as { n: number }).n,
    results: (db.prepare("SELECT COUNT(*) AS n FROM results").get() as { n: number }).n,
  };
}
