# Phase 0 Findings — equi-score.de + fn-erfolgsdaten.de Investigation

## TL;DR

fn-erfolgsdaten.de runs on a **GraphQL API** at `spectatorjudginga14295f70.hana.ondemand.com/andromeda-1.0.0/api/graph`. Individual competition results are **fully free**. Cross-event results by rider/horse are **paywalled**. The architecture must be **crawler-first**: we crawl shows, store results in our own SQLite database, and build search on top.

---

## 1. equi-score.de

| Item | Finding |
|---|---|
| robots.txt | `Allow: /` — fully crawlable |
| Rider/horse search | ❌ None |
| Data organisation | By event → `results.equi-score.com/event/[year]/[id]/de` |
| SSL cert | Fails in standard fetch; `ignoreHTTPSErrors: true` in Playwright fixes it |
| Events available | 800+ for 2026 alone; 2017–2026 all accessible |
| API | None public |

equi-score.de is a **publishing tool for organisers**. Every event is siloed; there is no rider/horse search anywhere on the site.

---

## 2. fn-erfolgsdaten.de

### Architecture

The site is a **Vue/Quasar SPA** ("Equestrian Hub") backed by a GraphQL API.

**GraphQL endpoint:** `https://spectatorjudginga14295f70.hana.ondemand.com/andromeda-1.0.0/api/graph`

Required headers (no auth token needed for free operations):
```
Content-Type: application/json
Origin: https://www.fn-erfolgsdaten.de
Referer: https://www.fn-erfolgsdaten.de/
```

### What's FREE (no account needed)

| Operation | Returns |
|---|---|
| `FindPersonsForEhV2` | Person search results: real names, `apiId`, `athleteApiId`, nation |
| `FindHorsesForEhV2` (inferred) | Horse search results: name, registration number |
| `GetShowMasterlist` | Show info + list of competition IDs, disciplines, dates |
| `GetShowCompetitions` | Same as above |
| `LoadPublicJumpingCompetition` | **Full competitor list**: rider name, `person.apiId`, horse name, `horse.apiId`, placement, score, status |
| `LoadPublicDressageCompetition` | Same for dressage |

### What's PAYWALLED (requires "Equestrian Hub Elite" subscription)

| Feature | Notes |
|---|---|
| `GetPersonProfileData` | Returns **anonymised/random person** ("Elisa Romano") instead of real data |
| `/profile/athlete_*/results` | Cross-event rider history — redirects to paywall |
| `/results` page | Filter by athlete, horse, discipline, year — all locked |
| Analytics, Rankings | Locked |

The API uses an **anti-bot hoofprint challenge** (`GetHoofprintChallenge`) that returns a nonce. Unauthenticated API calls or calls without a valid nonce receive anonymised responses.

### URL Patterns

```
/shows                                              — show list
/show/[showId]                                      — show detail (free)
/show/[showId]/competition/jumping/[compId]         — jumping results (free)
/show/[showId]/competition/dressage/[compId]        — dressage results (free)
/persons                                            — person search (free)
/horses                                             — horse search (free)
/profile/person_[id]/[Name]                         — person profile (paywalled)
/profile/athlete_[id]/results                       — rider history (paywalled)
```

### Key GraphQL Queries (confirmed working)

**Person search:**
```graphql
query FindPersonsForEhV2($term: String, $filter: EhPersonSearchFilterInput!, $order: EhPersonSearchOrder!, $page: Int) {
  foundPersons: findPersonsForEhV2(term: $term, filter: $filter, order: $order, page: $page) {
    persons {
      apiId
      name
      academicTitle
      nation { id ioc }
      imageUrl
      athleteApiId
    }
    totalPages
    totalElements
  }
}
# Variables: { term: "Klimke", filter: { isAthlete: true, ... }, order: "BEST", page: 0 }
```

**Show masterlist:**
```graphql
query GetShowMasterlist($showId: ID!) {
  masterlist: showMasterlist(showId: $showId) {
    showId name nationIoc firstDay lastDay
    competitions { id name number discipline status numberOfCompetitors }
  }
}
```

**Competition results (jumping):**
```graphql
# LoadPublicJumpingCompetition with { competitionId: "175537" }
# Returns: competitors[{ athlete.person.name, athlete.person.apiId, horse.name, horse.apiId, rankOfficial, placed, status }]
```

---

## 3. Architectural Decision

### Why crawler-first (not on-demand)

There is no endpoint that takes a rider name and returns their results across events. The cross-event search is paywalled. To answer "what has Klimke competed in?", we must:

1. Have already crawled all shows and stored their results in our database, OR
2. Pay for a subscription

### Chosen approach: Crawler-first with GraphQL API (no Playwright needed)

We call the GraphQL API **directly** (plain `fetch` / Node.js `undici`), no browser needed:

```
Phase 1: Seed
  → Call shows-by-week API to get list of recent shows
  → For each show: GetShowMasterlist → get competition IDs
  → For each competition: LoadPublicJumpingCompetition or LoadPublicDressageCompetition
  → Store in SQLite: riders, horses, results (with showId, competitionId, personApiId, horseApiId)

Phase 2: Search
  → User types a name → SQLite LIKE query on rider or horse name
  → Return matching results with show/competition links
```

No Playwright needed at all for fn-erfolgsdaten.de — the GraphQL API is callable directly.

### equi-score.de role

Use as a **supplementary source** for shows that may not appear in the FN database. These require Playwright + `ignoreHTTPSErrors: true` because of the SSL cert.

---

## 4. Data Shape (confirmed from API)

### Person (from search)
```ts
{ apiId: "person_01hge8nettfabatwqaecq9q89v", name: "Ingrid Klimke", nation: { ioc: "GER" }, athleteApiId: "athlete_..." }
```

### Competition result entry (from LoadPublicJumpingCompetition)
```ts
{
  athlete: {
    apiId: "athlete_...",
    person: { apiId: "person_...", name: "Stefan Miltenyi", firstName: "Stefan", familyName: "Miltenyi", nation: { ioc: "GER" } }
  },
  horse: { apiId: "h...", name: "Gut Wettlkam's D'avie FRH", permanentBridleNumber: "34431" },
  rankOfficial: 1,    // or null
  placed: true,
  horsConcours: false,
  status: "FINISHED"  // or "AUF" (retired), "AUS" (elim), "NG" (withdrawn), "DIS" (disq)
}
```

### Show competition list entry (from GetShowMasterlist)
```ts
{ id: "175537", name: ".80m Jumper Ii.2d", number: "520", discipline: "JUMPING", status: "FINISHED", numberOfCompetitors: 15 }
```

---

## 5. Next Steps

1. **Write the crawler** (`src/lib/crawler/index.ts`) — calls GraphQL API directly, no Playwright
2. **Write the DB schema** (`src/lib/db.ts`) — persons, horses, shows, competitions, results
3. **Run first seed** — crawl last 3 months from fn-erfolgsdaten.de
4. **Build Next.js search UI** on top of the local SQLite database
