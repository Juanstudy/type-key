# Apply Progress: PR3 (06c-results)

## Completed Tasks

### Task 3.1: Create `src/screens/results.ts`
- Created `src/screens/results.ts` with the `buildResults` function
- Imports: `StyledText`, `stringToStyledText`, `TextChunk` from `@opentui/core`; `colored` from `../ui/word-display`; chart helpers from `../ui/chart`; theme colors from `../ui/theme`; `SessionResult` type from `../lib/types`
- Exports `buildResults(result: SessionResult, wpmHistory?: number[]): StyledText`
- Body is verbatim copy from original `screens.ts`

### Task 3.2: Update `src/screens.ts`
1. ✅ Replaced `import { chart, renderToString, sparkArea } from "@crafter/charts"` with `import { downsample, renderChartLines, buildWpmChart, padCenter } from "./ui/chart"`
2. ✅ Removed local definitions of `downsample()`, `renderChartLines()`, `buildWpmChart()`, `padCenter()`
3. ✅ Removed `export function buildResults(...)` body entirely
4. ✅ Added `export { buildResults } from "./screens/results"` re-export
5. ✅ Kept all other function bodies and imports intact

## Files Changed
- `src/screens/results.ts` — **new file**, 88 lines
- `src/screens.ts` — 2 insertions, 163 deletions

## Test Commands Run
- `bun run typecheck` — **PASSED** (no errors)
- `bun run test` — **PASSED** (115 tests, 0 failures, 239 expect() calls)

## Verification Gates
| Gate | Status |
|------|--------|
| `bun run typecheck` | ✅ PASSED |
| `bun run test` (115 tests) | ✅ PASSED |
| `git diff src/engine/` | ✅ Zero changes |
| `git diff src/screens.test.ts` | ✅ Zero changes |
| Named imports only | ✅ Compliant |

## Deviations from Design
None. Exact implementation per spec.

## Remaining Tasks
None for PR3. PR3 is complete.

---

# Apply Progress: PR4 (06d-history)

## Completed Tasks

### Task 4.1: Create `src/screens/history.ts`
- Created `src/screens/history.ts` with all 5 functions
- Exports: `buildHistory`, `buildEmptyHistory`, `buildHistoryDetail`
- Internal (not exported): `formatModeOption`, `formatDate`
- Imports: `StyledText`, `stringToStyledText`, `TextChunk` from `@opentui/core`; `StoredSession`, `SessionAggregates` from `../lib/types`; `colored` from `../ui/word-display`; chart helpers from `../ui/chart`; theme colors from `../ui/theme`
- Bodies are verbatim copies from original `screens.ts`
- File: 314 lines

### Task 4.2: Update `src/screens.ts`
1. ✅ Removed function bodies for `buildHistory()`, `buildEmptyHistory()`, `buildHistoryDetail()`, `formatModeOption()`, `formatDate()`
2. ✅ Added `export { buildHistory, buildEmptyHistory, buildHistoryDetail } from "./screens/history"`
3. ✅ Removed local `export interface SessionResult { ... }` definition
4. ✅ Added `export type { SessionResult } from "./lib/types"` (used `export type` due to `isolatedModules`)
5. ✅ Cleaned up unused imports: removed `Word`, `StoredSession`, `SessionAggregates` from type imports; removed `StyledText`, `stringToStyledText` from `@opentui/core`; removed chart imports; removed `SELECTED_FG`, `HEADER_FG` from theme imports
6. ✅ Kept `wordText` function body, `Letter`/`TextChunk`/`CORRECT_FG`/`INCORRECT_FG`/`EXTRA_FG`/`colored` imports, and all barrel re-exports

## Files Changed
- `src/screens/history.ts` — **new file**, 314 lines
- `src/screens.ts` — 15 insertions, 342 deletions

## Test Commands Run
- `bun run typecheck` — **PASSED** (no errors)
- `bun run test` — **PASSED** (115 tests, 0 failures, 239 expect() calls)

## TDD Cycle Evidence
N/A — standard mode (strict TDD not active for this PR)

## Verification Gates
| Gate | Status |
|------|--------|
| `bun run typecheck` | ✅ PASSED |
| `bun run test` (115 tests) | ✅ PASSED |
| `git diff src/engine/` | ✅ Zero changes |
| `git diff src/screens.test.ts` | ✅ Zero changes |
| Named imports only | ✅ Compliant |
| Export surface preserved | ✅ All symbols importable from `"./screens"` |

## Deviations from Design
- Used `export type { SessionResult }` instead of `export { SessionResult }` because `isolatedModules` requires type-only re-exports for type-only exports
- Did not import `SessionResult` in `history.ts` (no function in history.ts uses it — the `buildHistoryDetail` uses `StoredSession` directly, not `SessionResult`)

## Remaining Tasks
None for PR4. PR4 is complete.

---

## Export Surface (verified)
| Symbol | Source | Re-exported? |
|--------|--------|:-----------:|
| `SessionResult` | `lib/types.ts` | ✅ `export type` |
| `wordText` | local in screens.ts | ✅ local definition |
| `shuffleWords` | `lib/wordlists.ts` | ✅ barrel |
| `VERSION` | `screens/menu.ts` | ✅ barrel |
| `buildMenu` | `screens/menu.ts` | ✅ barrel |
| `buildGame` | `screens/game.ts` | ✅ barrel |
| `buildResults` | `screens/results.ts` | ✅ barrel |
| `buildHistory` | `screens/history.ts` | ✅ barrel |
| `buildEmptyHistory` | `screens/history.ts` | ✅ barrel |
| `buildHistoryDetail` | `screens/history.ts` | ✅ barrel |

---

# Apply Progress: PR5 (06e-config-state)

## Completed Tasks

### Task 5.1: Create `src/lib/config.ts` shell
- Created `src/lib/config.ts` with placeholder module for future config persistence
- Content: `export {};` with comment about XDG config path resolution

### Task 5.2: Create `src/lib/state.ts` with extracted state & logic
- Created `src/lib/state.ts` (~370 lines) containing:
  - `KeyEvent` interface
  - `TIME_OPTIONS`, `WORD_COUNT_OPTIONS` constants
  - `state` object with all mutable game state fields
  - `wpmCalc` instance, `SCREEN_TEXT_ID`, `TITLE_FONT_ID`
  - `renderer` module-level variable (not exported; accessed via `setRenderer()`)
  - `show()` render function
  - Screen transitions: `addTitleFont()`, `removeTitleFont()`, `getMenuOptions()`, `getMenuSelectedIndex()`, `goMenu()`, `checkGameComplete()`, `goGame()`, `showGame()`, `goResults()`, `updateLiveWpm()`, `goHistory()`, `goHistoryDetail()`
  - Keyboard handling: `handleQuit()`, `handleKey()`
  - Exports: `initDB` (re-export from db), `setRenderer`, `goMenu`, `goGame`, `goResults`, `goHistory`, `handleQuit`, `handleKey`
  - All bodies are verbatim copies from original `index.ts`

### Task 5.3: Slim `src/index.ts`
- Reduced from ~490 lines to ~35 lines
- Only owns `main()` bootstrap: creates renderer, sets up key handler, SIGINT handler, calls `initDB()` and `goMenu()`
- Imports from `./lib/state`: `handleKey`, `handleQuit`, `goMenu`, `initDB`, `setRenderer`

## Files Changed
- `src/lib/config.ts` — **new file**, 3 lines
- `src/lib/state.ts` — **new file**, ~370 lines
- `src/index.ts` — 45 insertions, 487 deletions

## Test Commands Run
- `bun run typecheck` — **PASSED** (no errors)
- `bun run test` — **PASSED** (115 tests, 0 failures, 239 expect() calls)

## TDD Cycle Evidence
N/A — pure refactoring (existing tests fully cover all extracted code paths)

## Verification Gates
| Gate | Status |
|------|--------|
| `bun run typecheck` | ✅ PASSED |
| `bun run test` (115 tests) | ✅ PASSED |
| `git diff src/engine/` | ✅ Zero changes |
| `git diff src/screens.test.ts` | ✅ Zero changes |
| Named imports only | ✅ Compliant |

## Deviations from Design
- **Required `setRenderer()` setter function**: ESM doesn't allow reassigning imported bindings, so instead of exporting `let renderer`, the module exposes `setRenderer(r: CliRenderer)` which sets the module-scoped variable. This is semantically equivalent.
- **Import paths corrected**: Spec showed `import type { SessionResult } from "../types"` but from `src/lib/state.ts`, the correct path is `./types` (since `SessionResult` lives in `src/lib/types.ts`).
- **Biome auto-formatter**: Converted `export let renderer` to `export const renderer`; added `biome-ignore lint/style/useConst` to preserve the reassignment semantics. Later refactored away from `export let` to the setter pattern.

## Remaining Tasks
None for PR5. PR5 is complete.
