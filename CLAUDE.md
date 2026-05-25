# equisearch

A website for searching riders and horses in German equestrian competitions. Crawls fn-erfolgsdaten.de, stores results in SQLite, and serves a Next.js search UI.

## Project Overview

Riders and horses in German equestrian competitions have no central cross-event search. The FN (German Equestrian Federation) official results database (fn-erfolgsdaten.de) has per-rider history but it's paywalled. This project crawls all public show results via the FN's GraphQL API, indexes them in SQLite, and serves them through a fast search UI.

## Architecture

**Crawler-first**: crawl all shows upfront → store in SQLite → search locally. On-demand scraping is not viable because cross-event rider history requires a paid FN account.

```
scripts/seed.ts          CLI entry point for crawling
src/lib/crawler.ts       Crawl logic: show list → masterlist → competitions → results
src/lib/api/client.ts    Plain-fetch GraphQL client (no Playwright needed)
src/lib/api/queries.ts   GraphQL query strings
src/lib/api/types.ts     TypeScript types for API responses
src/lib/db.ts            SQLite schema, upserts, search queries
src/app/                 Next.js App Router pages
src/components/          Shared React components (ScoreChart)
data/equi-score.db       SQLite database (gitignored)
scripts/                 Crawl utilities and exploration scripts
```

## Tech Stack

- **Framework**: Next.js (App Router, TypeScript, Tailwind CSS)
- **Database**: SQLite via `better-sqlite3`
- **Charts**: Recharts
- **URL state**: nuqs (available, not yet used — currently plain useState)
- **Playwright**: installed but not needed for data; only used for early exploration

## Development

```bash
npm run dev       # start dev server on localhost:3000

# Seed / re-seed the database
node_modules/.bin/tsx scripts/seed.ts                              # last 3 months, GER only, no limit
node_modules/.bin/tsx scripts/seed.ts --from 2026-01-01 --to 2026-04-30 --max 300
node_modules/.bin/tsx scripts/seed.ts --show 263133               # single show by ID
```

Node is managed via nvm. If `npx` or `node` isn't found, prefix with:
```bash
source /home/alicia/.nvm/nvm.sh && ...
```

## Data Source: fn-erfolgsdaten.de

The site is a Vue/Quasar SPA backed by a **GraphQL API** that is callable with plain `fetch` — no Playwright needed.

**Endpoint**: `https://spectatorjudginga14295f70.hana.ondemand.com/andromeda-1.0.0/api/graph`

**Required headers** (without these the API returns errors):
```
Content-Type: application/json
Accept: application/json
Origin: https://www.fn-erfolgsdaten.de
Referer: https://www.fn-erfolgsdaten.de/
Accept-Language: de
User-Agent: Mozilla/5.0 ...
```

**Key operations** (correct root field names — wrong names cause FieldUndefined errors):
- `FindShowsForEhV2` / `findShowsForEhV2` — paginated show search
- `GetShowMasterlist` / `showMasterlist` — competitions for a show
- `LoadPublicJumpingCompetition` / `publicJumpingIndividualCompetition`
- `LoadPublicDressageCompetition` / `publicDressageCompetition`
- `LoadPublicEventingCompetition` / `publicEventingIndividualCompetition`

**Competitor fields require inline fragments** — `athlete` and `horse` are NOT direct fields on competitors, they live inside nested type fragments:
```graphql
competitors {
  ... on JumpingCompetitor {
    ... on JumpingIndividualCompetitor {
      athlete { ... }
      horse { ... }
    }
  }
}
```

**Show ordering**: The only known valid `order` value is `BEST`. `DATE_DESC` is rejected. `BEST` prioritizes currently active/popular shows — current-week shows with unpublished results appear first. Always use a `--to` date at least 2 weeks in the past to avoid wasting budget on unpublished shows.

**Show eligibility filter** (applied in crawler): `publishingStatus === "PUBLISHED_CONFIRMED"` AND `numberOfFinishedCompetitors > 0` AND discipline in `{JUMPING, DRESSAGE, EVENTING}`.

**nationIoc: "GER"** filters by FN-registered nation, not physical location. Some shows held abroad (CSN events) appear because they're registered with FN for German riders.

**Rate limiting**: 1200ms delay between API calls (`DELAY_MS` in crawler.ts). Do not reduce without checking.

## SQLite Schema

Tables: `shows`, `competitions`, `persons`, `horses`, `results`

Key design choices:
- `persons.name_normalized` and `horses.name_normalized` store umlaut-folded lowercase names (ä→ae, ö→oe, ü→ue, ß→ss). Search hits both original and normalized so "Mueller" finds "Müller".
- `results` has `UNIQUE(competition_id, person_api_id, horse_api_id)` — upserts are safe to re-run.
- Shows are only stored in DB once at least one eligible competition has been confirmed. Prevents `isShowCrawled()` from permanently skipping shows that returned 0 results due to a filter issue.

## Pages

| Route | Type | Description |
|---|---|---|
| `/` | Client Component | Search home — text input + Reiter/Pferd toggle |
| `/api/search?q=...&type=rider\|horse` | API Route | Returns `PersonRow[]` or `HorseRow[]` |
| `/rider/[id]` | Server Component | Rider profile: results table + dressage chart |
| `/horse/[id]` | Server Component | Horse profile: results table + dressage chart |

`better-sqlite3` is Node-only and synchronous — import it only from Server Components and API routes, never from Client Components.

## Known Gotchas

- **`isShowCrawled` check**: relies on show row existing in DB. If a show was partially crawled (e.g., process killed mid-way), competitions already stored won't be re-fetched on next run. Delete the DB and re-seed if you need clean data.
- **`--max N` budget**: counts only shows with ≥1 ingested result. Shows with 0 eligible competitions are skipped and do not consume budget. They're also not stored, so they'll be re-checked on the next crawl run.
- **Recharts Formatter type**: `formatter` on `<Tooltip>` receives `ValueType | undefined`, not `number`. Guard with `typeof v === "number"` before calling `.toFixed()`.
