# equisearch

Cross-event search for riders and horses in German equestrian competitions.

The FN (German Equestrian Federation) official results site [fn-erfolgsdaten.de](https://www.fn-erfolgsdaten.de) has a full rider and horse history — but it's locked behind a paid subscription. Their public GraphQL API exposes individual competition results for free, so this project crawls all of it, stores the results in SQLite, and serves a fast local search UI.

## Features

- Search riders and horses by name across all crawled shows
- Umlaut-aware: "Mueller" finds "Müller"
- Rider and horse profile pages with full result history
- Score-over-time chart for dressage competitors
- Covers jumping, dressage, and eventing

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **SQLite** via `better-sqlite3` — all data stored locally
- **Recharts** for score visualizations
- **Plain fetch** to the FN GraphQL API — no browser automation needed

## Getting Started

**Prerequisites**: Node.js via nvm. If `node` isn't found, run `source ~/.nvm/nvm.sh` first.

```bash
npm install
```

### Seed the database

The search UI requires a local SQLite database. Seed it by crawling the FN results API:

```bash
# Last 3 months, German shows only (recommended first run)
node_modules/.bin/tsx scripts/seed.ts

# Custom date range and show limit
node_modules/.bin/tsx scripts/seed.ts --from 2026-01-01 --to 2026-04-30 --max 300

# Single show by ID
node_modules/.bin/tsx scripts/seed.ts --show 263133
```

Tip: use a `--to` date at least two weeks in the past. Shows with unpublished results appear first in the API and waste crawl budget.

### Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
scripts/seed.ts              CLI entry point for crawling
src/lib/crawler.ts           Crawl logic: show list → masterlist → competitions → results
src/lib/api/client.ts        GraphQL client (plain fetch)
src/lib/api/queries.ts       GraphQL query strings
src/lib/api/types.ts         TypeScript types for API responses
src/lib/db.ts                SQLite schema, upserts, search queries
src/app/                     Next.js App Router pages
src/components/              Shared React components (ScoreChart)
data/equi-score.db           SQLite database (gitignored)
```

## Data Source

Results are fetched from the FN's public GraphQL API at `spectatorjudginga14295f70.hana.ondemand.com`. Individual competition results (rider names, horse names, placements, scores) are freely accessible without authentication. Cross-event rider history is paywalled on the FN site — which is exactly why this crawler exists.

The crawler respects a 1200ms delay between API calls and filters only `PUBLISHED_CONFIRMED` shows with finished competitors.
