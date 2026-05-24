# equi-score-search

A website for searching riders and horses in equestrian competitions, pulling data from equi-score.de and fn-erfolgsdaten.de.

## Project Overview

Riders and horses in German equestrian competitions have no central cross-event search. This project crawls equi-score.de (event results) and fn-erfolgsdaten.de (FN official results database) to build a searchable index.

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript, Tailwind CSS)
- **Database**: SQLite via `better-sqlite3`
- **Scraping**: Playwright (Chromium headless)
- **Charts**: Recharts
- **URL state**: nuqs

## Development

```bash
npm run dev       # start dev server on localhost:3000
npx tsx scripts/test-scraper.ts   # test scraper manually
```

## Data Sources

- **fn-erfolgsdaten.de** — FN official results DB, has rider/horse search (JS SPA, needs Playwright)
- **equi-score.de/results** — event list; results at results.equi-score.com/event/[year]/[id]/de (SSL cert issue, use ignoreHTTPSErrors in Playwright)

## Key Findings (Phase 0)

- No public API on either source
- fn-erfolgsdaten.de has native rider/horse search — use as primary source (on-demand scraping)
- equi-score.de is event-organised only — use as supplementary/live source
- robots.txt: `Allow: /` on equi-score.de
