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

## Architecture

Feature-based structure with context providers for dataset management and calendar state.
