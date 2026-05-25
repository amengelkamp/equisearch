# Project Brainstorming — equi-score-search

Answer the questions below to shape the direction of the project. Pick the option(s) that best fit your vision.

---

## 1. What is the primary use case?

- [ ] A) Search for a **rider's** full competition history across all events
- [ ] B) Search for a **horse's** full competition history across all events
- [x] C) Both — search for riders and horses, with the ability to filter by the other (e.g. "show results where rider X competed on horse Y")
- [ ] D) Start simple with rider search only, add horse search later

---

## 2. Where does the data come from?

- [ ] A) **Scrape equi-score.de** on demand (live, per search request)
- [ ] B) **Scrape and cache** — crawl equi-score.de regularly and store data in our own database
- [ ] C) **Check if equi-score.de has an API** first; fall back to scraping if not
- [x] D) I'm not sure yet — let's investigate the site first

---

## 3. What kind of search experience do you want?

- [ ] A) Simple text search — type a name, get a list of matches
- [ ] B) Faceted / filtered search — filter by discipline, date range, competition level, location, etc.
- [ ] C) Autocomplete suggestions as you type
- [x] D) All of the above — full-featured search with filters and autocomplete

---

## 4. What should a result page show?

- [ ] A) A table of competitions with date, event name, placement, and score
- [ ] B) A summary card (total starts, avg score, best placement) plus the full table
- [x] C) Charts and visualizations (score over time, win rate, etc.) in addition to raw data
- [x] D) A comparison view — put two riders or two horses side by side

---

## 5. Who is the target audience?

- [ ] A) Casual fans — easy to use, no login required
- [x] B) Riders and trainers — may want to save searches, track specific horses/riders, get notifications
- [ ] C) Competition organizers / officials
- [ ] D) All of the above (public site, optional account for power features)

---

## 6. Do you want user accounts?

- [x] A) No — fully public, no login
- [ ] B) Optional login for saving favorites / search history
- [ ] C) Yes — accounts required (members only)
- [ ] D) Not sure yet

---

## 7. What is the preferred frontend approach?

- [x] A) **React** (e.g. Next.js) — large ecosystem, good for dynamic UIs
- [ ] B) **Vue** (e.g. Nuxt) — lighter, good DX
- [ ] C) **Plain HTML + JS** — keep it simple, no framework
- [ ] D) **Svelte / SvelteKit** — modern, minimal bundle size
- [ ] E) No preference — recommend based on the other answers

---

## 8. What is the preferred backend / hosting approach?

- [ ] A) **Serverless** (e.g. Vercel, Netlify Functions) — low ops overhead
- [x] B) **TypeScript backend** (Node.js / Express / Fastify), running locally for now
- [ ] C) **Python backend** (FastAPI / Flask) on a VPS
- [ ] D) **Static site** with no backend (only possible if data is pre-built)
- [ ] E) No preference

---

## 9. How important is mobile support?

- [ ] A) Mobile-first — most users will be on phones at competitions
- [ ] B) Desktop-first — primarily used at home for research
- [x] C) Both equally important — fully responsive

---

## 10. What is the timeline / scope you have in mind?

- [x] A) Quick MVP in a weekend — minimal features, get something live fast
- [ ] B) A few weeks — solid v1 with core search working well
- [ ] C) Longer project — full-featured, polished product
- [ ] D) No fixed timeline, build iteratively
