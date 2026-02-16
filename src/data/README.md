# Data

Two top-level categories: **state-level** data and **district-level** data.

## stateData/

Per-state metrics (all 50 states): efficiency gap, partisan lean, district counts, redistricting authority, etc.

| File | Role | Used at runtime |
|------|------|:---:|
| `stateData.csv` | Source of truth for state metrics (hand-edited) | no |
| `stateData.ts` | TypeScript export generated from CSV | yes |
| `stateGroups.ts` | Groups states by district count for the match graph UI | yes |
| `csv-to-statedata.cjs` | Regenerates `stateData.ts` from `stateData.csv` | no |
| `calculate-metrics.cjs` | Verifies efficiency gap and partisan lean against `planscore-2024-raw.tsv`. Console-only; doesn't write files | no |

Workflow: edit `stateData.csv` then run `node src/data/stateData/csv-to-statedata.cjs`.

## districtData/

Per-district PVI (Partisan Voting Index) values, organized by map type. Each subfolder is self-contained: raw inputs, processing script, consolidated CSV, and TypeScript loader.

### How district data flows into the app

1. Each loader (`*MapPVIs.ts`) parses its CSV and exports a `Record<string, SafeSeatCounts>` via `safeSeats.ts`
2. `alternateMapPVIs.ts` re-exports whichever map type is the active alternative (currently **proportional**)
3. The matching algorithm (`findMatches.ts`) compares enacted vs. alternate safe seats to find match pairs
4. The truce adjustment (`computeTruceAdjustment.ts`) swaps matched states' enacted data for alternate data

To switch the active alternate map, change one import line in `alternateMapPVIs.ts`.

### Shared files

| File | Role | Used at runtime |
|------|------|:---:|
| `safeSeats.ts` | `SafeSeatCounts` type, `categorizePVIs()` utility, and enacted safe-seat computation | yes |
| `alternateMapPVIs.ts` | Indirection layer that re-exports the active alternate map | yes |

### enacted/

The currently enacted congressional maps (2025 Cook PVI).

| File | Role | Used at runtime |
|------|------|:---:|
| `districtPVI.csv` | 2025 Cook PVI for all 435 districts | yes (via `safeSeats.ts`) |
| `planscore-2024-raw.tsv` | PlanScore 2024 election results; input for `calculate-metrics.cjs` | no |

Source: [Cook Political Report PVI](https://www.cookpolitical.com/cook-pvi) and [PlanScore](https://github.com/PlanScore/National-EG-Map).

### proportional/ [ACTIVE alternate]

DRA "most proportional" maps for the 44 multi-district states.

| File | Role | Used at runtime |
|------|------|:---:|
| `draProportionalMaps.csv` | Consolidated district PVIs | yes (via `proportionalMapPVIs.ts`) |
| `proportionalMapPVIs.ts` | Loader; exports `proportionalMapSafeSeats` | yes |
| `consolidate-dra-proportional.cjs` | Consolidates `raw/` per-state CSVs into `draProportionalMaps.csv` | no |
| `raw/` | 44 per-state CSVs from Dave's Redistricting App | no |

Source: [Dave's Redistricting App](https://davesredistricting.org/) (most proportional maps).

### competitive/

DRA "most competitive" maps. Same structure as proportional. **Not currently active** but available for swap-in.

| File | Role | Used at runtime |
|------|------|:---:|
| `draCompetitiveMaps.csv` | Consolidated district PVIs | no (inactive) |
| `competitiveMapPVIs.ts` | Loader; exports `competitiveMapSafeSeats` | no (inactive) |
| `consolidate-dra-competitive.cjs` | Consolidates `raw/` per-state CSVs into `draCompetitiveMaps.csv` | no |
| `raw/` | 44 per-state CSVs from Dave's Redistricting App | no |

Source: [Dave's Redistricting App](https://davesredistricting.org/) (most competitive maps).

### compact/

ALARM Project median-compactness maps. **Not currently active** but available for swap-in.

| File | Role | Used at runtime |
|------|------|:---:|
| `alarmCompactMaps.csv` | Consolidated district PVIs | no (inactive) |
| `compactMapPVIs.ts` | Loader; exports `compactMapSafeSeats` | no (inactive) |
| `fetch-alarm-data.cjs` | Fetches simulation data from Harvard Dataverse API | no |

Source: [ALARM Project 50-State Simulations](https://alarm-redist.org/fifty-states/) via [Harvard Dataverse](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/SLCD3E).
