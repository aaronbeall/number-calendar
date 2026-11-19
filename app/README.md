# Number Calendar

Data tracking and visualization app with statistical analysis, goals, and achievements.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- ShadCN UI
- Tanstack Query
- IndexedDB

## Dev

```bash
npm install
npm run dev
```

## Key Features

- Calendar grid with daily number entry
- Mobile friendly
- Numeric expression parsing for entry: `1+2-5` → `[1, 2, -5]`)
- `Datasets` with `tracking` mode and `valence` to appriopriately render semantics of the data
  - `tracking=series`: Data represents a series of accumulated numbers (`[25, -5, 72, 120]` → `152`)
  - `tracking=trend`: Data is tracking a single value over time (`[120, 121, 122, 121, 122]`)
  - `valence=positive`: Numbers are "good" when they are positive or trending higher, "bad" when negative or trending lower (e.g. P&L)
  - `valence=negative`: Numbers are "good" when they are negative or trending lower, "bad" when positive or trending higher (e.g. Weight Loss)
  - `valence=neutral`: Numbers don't have intrinsic directional value (may have range bound value, handled by goal system)
- Statistical aggregations (day/week/month/year/all-time), including averages, range, sum (total), deltas, cumulatives, extremes, etc
  - "Stats" represent the direct aggregation in a period's number set (mean, median, min, max, etc)
  - "Source" represents derived stats from multiple aggregations (deltas, cumulatives, etc)
  - Each dataset has a "primary metric" and "valence source" to determine what the main statistic to show (series=total, trend=close) and what determines it is good or not (series=total, trend=delta)
- Interactive line charts with valence-based coloring
- Goal system with achievements and badges
  - `Goal` is a generic model with requirement conditions, styling, and goal type categorization:
    - `Milestones` are one-time goals
    - `Targets` are period repeating goals (daily/weekly/monthly/yearly)
    - `Goals` (aka "Achievements") are any goal (could take the structure of a milestone or target but aren't presented to the user as such)
  - `Achievement`/`AchievementResult` -- an instance of an accomplished goal
- Notes and meta data for any period
- Friendly template drivien builders (datasets, goals, etc)
- Import/export (CSV, JSON)
- Local-first
- IndexedDB persistence

## PWA and SEO

- **Offline:** `vite-plugin-pwa` generates a Workbox service worker (`dist/sw.js`) that precaches the whole app, including every lazy route chunk, so it runs with no connection after the first visit. Client-side routes fall back to the cached `index.html`. Google Fonts are cached at runtime.
- **Updates:** a new deploy shows a "new version is available" toast with a Reload button (`src/features/pwa/PwaPrompts.tsx`). Open tabs check for updates hourly and when they become visible.
- **Install:** `public/site.webmanifest` has icons (including maskable), shortcuts and install screenshots. "Install App" in the user menu shows the browser's install dialog, or Add to Home Screen steps on iPhone and iPad. Regenerate the screenshots with `node scripts/landing-screenshots/pwa.cjs` while `npm run dev` is running.
- **Storage:** the app asks the browser to make storage persistent so IndexedDB data isn't evicted.
- **Pages:** the homepage and the app are separate Vite entries. `index.html` + `src/home.tsx` is the public homepage at `/`: it loads no app code, registers no service worker and isn't precached. It only counts the calendars in IndexedDB (without creating the database) to show returning visitors an "Open your data" button rather than redirecting them. `app/index.html` + `src/main.tsx` is the app under `/app` (`/app` is the calendars list, `/app/dataset/:id/...` a calendar). The installed PWA starts there, and its service worker (`/sw.js`, scope `/app/`) precaches only the app. On GitHub Pages, `404.html` is a copy of the app shell, so deep `/app/...` links work and any other unknown path goes to the homepage. The dev and preview servers serve the app shell for `/app/...` too (see `appShellFallback` in `vite.config.ts`).
- **SEO:** `index.html` has the canonical URL, Open Graph and Twitter tags and JSON-LD (`Organization`, `WebSite`, `WebApplication`). `robots.txt` and `llms.txt` are in `public/`; `sitemap.xml` is written at build time. Only the homepage is indexable: `src/features/seo/RouteHead.tsx` sets titles per page and marks every `/app` page `noindex`, since they show data from the visitor's own browser.

## Architecture

Feature-based structure with context providers for dataset management and calendar state.

Fix deployment
