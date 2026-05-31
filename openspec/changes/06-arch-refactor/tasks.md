# Tasks: 06-arch-refactor — Structural Refactoring

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~142 + ~89 + ~90 + ~254 + ~20-250 + ~35 = ~660-860 total |
| 400-line budget risk | Medium (PR4 ~254, PR5 ~20-250) |
| Chained PRs recommended | Yes |
| Suggested split | 6 sequential PRs: PR1→PR2→PR3→PR4→PR5→PR6 |
| Delivery strategy | auto-chain (each PR merged to dev before next starts) |
| Chain strategy | stacked-to-main (via dev branch, sequential PRs to dev→main) |

```text
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium
```

## Global Definition of Done

1. **All tests pass**: `bun run test` — exit code 0, ~115 tests pass identically
2. **Typecheck passes**: `bun run typecheck` — exit code 0
3. **Barrel is pure**: `src/screens.ts` contains only `export { ... } from "..."` re-export statements
4. **Full export surface preserved**: All 10 public symbols from original `screens.ts` importable from `"./screens"`
5. **Zero behavior change**: No new features, no changed output, no new tests
6. **No dead code**: Zero commented-out code, orphaned functions, or unused imports
7. **No circular dependencies**: Module dependency graph is acyclic
8. **No engine modifications**: `src/engine/` directory untouched (`git diff src/engine/` shows zero)
9. **No test modifications**: `src/screens.test.ts` unchanged (import paths work via barrel)
10. **Each PR ≤ 400 Δ lines**: All 6 PRs respect review budget
11. **New files exist**: `screens/menu.ts`, `screens/game.ts`, `screens/results.ts`, `screens/history.ts`, `ui/theme.ts`, `ui/chart.ts`, `ui/word-display.ts`, `lib/wordlists.ts`; plus `lib/config.ts` shell (PR5)

---

## Per-PR Task Breakdown

---

### PR 1: `06a-ui-primitives` (≈142 Δ lines | Risk: Low)

Extract UI primitive modules from `screens.ts`. Move `SessionResult` to `lib/types.ts` to avoid circular deps. After PR1, `screens.ts` still has all screen builder bodies but imports deps from new modules.

#### Task 1.1: Create `src/ui/theme.ts`

- **Action**: CREATE
- **Content**: 5 color constants verbatim from `screens.ts`
- **Imports**: None
- **Exports**: `CORRECT_FG`, `INCORRECT_FG`, `EXTRA_FG`, `SELECTED_FG`, `HEADER_FG`
- **Verify**: `bun run typecheck`

#### Task 1.2: Create `src/ui/word-display.ts`

- **Action**: CREATE
- **Content**: Extract `colored()` and `wordText()` from `screens.ts`
- **Imports**: `import type { TextChunk } from "@opentui/core"`; `import { CORRECT_FG, INCORRECT_FG, EXTRA_FG } from "./theme"`; `import type { Letter } from "../lib/types"`
- **Exports**: `colored(text: string, color: string): TextChunk`, `wordText(word: { letters: Letter[]; isCompleted: boolean }): TextChunk[]`
- **Key detail**: `colored()` IS exported (used by all screen builders — not private)
- **Verify**: `bun run typecheck`

#### Task 1.3: Create `src/ui/chart.ts`

- **Action**: CREATE
- **Content**: Extract `downsample()`, `renderChartLines()`, `buildWpmChart()`, `padCenter()` from `screens.ts`
- **Imports**: `import { chart, renderToString, sparkArea } from "@crafter/charts"`; `import type { TextChunk } from "@opentui/core"`; `import { stringToStyledText } from "@opentui/core"`; `import { HEADER_FG } from "./theme"`
- **Exports**: All 4 functions exported
- **Verify**: `bun run typecheck`

#### Task 1.4: Create `src/lib/wordlists.ts`

- **Action**: CREATE
- **Content**: Extract `shuffleWords()` from `screens.ts`
- **Imports**: `import wordlist from "../data/wordlists/english.json"`
- **Exports**: `shuffleWords(count: number): string[]`
- **Verify**: `bun run typecheck`, `shuffleWords(5)` returns array of 5 strings

#### Task 1.5: Add `SessionResult` to `src/lib/types.ts`

- **Action**: MODIFY (append — existing types unchanged)
- **Content**:
  ```typescript
  export interface SessionResult {
    wpm: number; rawWpm: number; accuracy: number;
    correctChars: number; totalChars: number; errors: number;
  }
  ```
- **Critical**: Keep `SessionResult` also defined in `screens.ts` (both co-exist during transition)
- **Verify**: `import type { SessionResult } from "./lib/types"` works

#### Task 1.6: Update `src/screens.ts` imports

- **Action**: MODIFY
- **Changes**:
  1. Replace 5 inline color constants with: `import { CORRECT_FG, INCORRECT_FG, EXTRA_FG, SELECTED_FG, HEADER_FG } from "./ui/theme"`
  2. Replace inline `colored()` with: `import { colored } from "./ui/word-display"`
  3. Replace inline `shuffleWords()` with: `import { shuffleWords } from "./lib/wordlists"`
  4. Remove `import wordlist from "./data/wordlists/english.json"`
  5. Keep all function bodies: `wordText`, `buildMenu`, `buildGame`, `downsample`, `renderChartLines`, `buildWpmChart`, `padCenter`, `buildResults`, `formatModeOption`, `formatDate`, `buildHistory`, `buildEmptyHistory`, `buildHistoryDetail`, `VERSION`, `MODE_LABELS`, `SessionResult`
  6. Keep all other existing imports untouched
- **Verify**: `bun run typecheck && bun run test`

#### PR 1 Gate
```bash
bun run typecheck   # must pass
bun run test        # must pass
git diff --stat     # ~142 Δ lines
git diff src/engine/  # zero
git diff src/screens.test.ts  # zero
```

---

### PR 2: `06b-menu-game` (≈89 Δ lines | Risk: Low)

Extract `buildMenu()` and `buildGame()` into separate files. Remove their function bodies from `screens.ts` and replace with barrel re-exports.

#### Task 2.1: Create `src/screens/menu.ts`

- **Action**: CREATE
- **Imports**: `import { StyledText, stringToStyledText } from "@opentui/core"`; `import type { TextChunk } from "@opentui/core"`; `import { colored } from "../ui/word-display"`; `import { HEADER_FG, SELECTED_FG } from "../ui/theme"`
- **Exports**: `VERSION` (string), `buildMenu(mode, selectedIndex, options): StyledText`
- **Internal**: `MODE_LABELS` (not exported)
- **Body**: Verbatim from `screens.ts` lines 75-119
- **Verify**: `bun run typecheck`

#### Task 2.2: Create `src/screens/game.ts`

- **Action**: CREATE
- **Imports**: `import { StyledText } from "@opentui/core"`; `import type { TextChunk } from "@opentui/core"`; `import type { Word } from "../lib/types"`; `import { colored, wordText } from "../ui/word-display"`; `import { HEADER_FG } from "../ui/theme"`
- **Exports**: `buildGame(remainingSeconds, liveWpm, liveRawWpm, words, currentWordIndex): StyledText`
- **Body**: Verbatim from `screens.ts` lines 121-155
- **Verify**: `bun run typecheck`

#### Task 2.3: Update `src/screens.ts`

- **Action**: MODIFY
- **Changes**:
  1. Remove `export const VERSION = "1.0.0"`
  2. Remove `const MODE_LABELS = ...`
  3. Remove `export function buildMenu(...)` body
  4. Remove `export function buildGame(...)` body
  5. Add: `export { VERSION, buildMenu } from "./screens/menu"`
  6. Add: `export { buildGame } from "./screens/game"`
- **DO NOT remove**: `colored`/theme imports (still used by `buildResults`/`buildHistory` remaining in screens.ts)
- **Verify**: `bun run typecheck && bun run test`

#### PR 2 Gate
```bash
bun run typecheck   # must pass
bun run test        # must pass
git diff --stat     # ~89 Δ lines
```

---

### PR 3: `06c-results` (≈90 Δ lines | Risk: Low)

Extract `buildResults()` into its own file. Switch `screens.ts` to import chart helpers from `ui/chart.ts` instead of defining them locally.

#### Task 3.1: Create `src/screens/results.ts`

- **Action**: CREATE
- **Imports**: `import { StyledText, stringToStyledText } from "@opentui/core"`; `import type { TextChunk } from "@opentui/core"`; `import { colored } from "../ui/word-display"`; `import { buildWpmChart, renderChartLines, padCenter } from "../ui/chart"`; `import { HEADER_FG, SELECTED_FG } from "../ui/theme"`; `import type { SessionResult } from "../lib/types"`
- **Exports**: `buildResults(result: SessionResult, wpmHistory?: number[]): StyledText`
- **Body**: Verbatim from `screens.ts` lines 242-332
- **Verify**: `bun run typecheck`

#### Task 3.2: Update `src/screens.ts`

- **Action**: MODIFY
- **Changes**:
  1. Remove `export function buildResults(...)` body
  2. Add: `export { buildResults } from "./screens/results"`
  3. **Add import**: `import { downsample, renderChartLines, buildWpmChart, padCenter } from "./ui/chart"`
  4. **Remove** local definitions of `downsample()`, `renderChartLines()`, `buildWpmChart()`, `padCenter()`
  5. Remove `import { chart, renderToString, sparkArea } from "@crafter/charts"` (no longer needed)
- **Key**: Removing local chart defs AND adding chart imports at the same step eliminates duplicate identifier errors
- **Verify**: `bun run typecheck && bun run test`

#### PR 3 Gate
```bash
bun run typecheck   # must pass
bun run test        # must pass
git diff --stat     # ~90 Δ lines
git diff src/screens.test.ts  # zero
```

---

### PR 4: `06d-history` (≈254 Δ lines | Risk: Low-Med)

Largest extraction: all 3 history builders + internal helpers. After this PR, `screens.ts` contains only `wordText` (function body) + `SessionResult` (interface) + barrel re-exports.

#### Task 4.1: Create `src/screens/history.ts`

- **Action**: CREATE
- **Imports**: `import { StyledText, stringToStyledText } from "@opentui/core"`; `import type { TextChunk } from "@opentui/core"`; `import type { StoredSession, SessionAggregates } from "../lib/types"`; `import type { SessionResult } from "../lib/types"`; `import { colored } from "../ui/word-display"`; `import { buildWpmChart, renderChartLines, padCenter } from "../ui/chart"`; `import { HEADER_FG, SELECTED_FG } from "../ui/theme"`
- **Exports**:
  - `buildHistory(sessions, aggregates, page, totalPages, selectedIndex): StyledText`
  - `buildEmptyHistory(): StyledText`
  - `buildHistoryDetail(session): StyledText`
- **Internal (NOT exported)**: `formatModeOption()`, `formatDate()`
- **Bodies**: Verbatim copies from `screens.ts`:
  - `buildHistory()` → lines 349-455
  - `buildEmptyHistory()` → lines 460-510
  - `buildHistoryDetail()` → lines 514-594
  - `formatModeOption()` → lines 332-340
  - `formatDate()` → lines 342-345
- **Verify**: `bun run typecheck`

#### Task 4.2: Update `src/screens.ts`

- **Action**: MODIFY
- **Changes**:
  1. Remove function bodies for `buildHistory()`, `buildEmptyHistory()`, `buildHistoryDetail()`, `formatModeOption()`, `formatDate()`
  2. Add: `export { buildHistory, buildEmptyHistory, buildHistoryDetail } from "./screens/history"`
  3. Remove unused imports: `import type { StoredSession, SessionAggregates } from "./lib/types"`, `import { StyledText, stringToStyledText } from "@opentui/core"`, `import wordlist from "./data/wordlists/english.json"` (if still present)
  4. Remove local `export interface SessionResult { ... }` definition
  5. Add: `export { SessionResult } from "./lib/types"`
- **What remains in screens.ts after this task**:
  - `import type { Letter } from "./lib/types"` — used by `wordText`
  - `import type { TextChunk } from "@opentui/core"` — used by `wordText`
  - `import { CORRECT_FG, INCORRECT_FG, EXTRA_FG } from "./ui/theme"` — used by `wordText`
  - `export function wordText(word: { ... }): TextChunk[] { ... }` — function body (not yet imported, stays local)
  - Barrel re-exports: `VERSION`, `buildMenu`, `buildGame`, `buildResults`, `buildHistory`, `buildEmptyHistory`, `buildHistoryDetail`, `shuffleWords`, `SessionResult`
- **Verify**: `bun run typecheck && bun run test`

#### PR 4 Gate
```bash
bun run typecheck   # must pass
bun run test        # must pass
git diff --stat     # ~254 Δ lines
```

---

### PR 5: `06e-config-state` (≈20-250 Δ lines | Risk: Med)

**SessionResult move already done in PR1** — this PR only creates config shell and optionally extracts state.

#### Task 5.1: Create `src/lib/config.ts` (shell)

- **Action**: CREATE
- **Content**: Placeholder shell module ready for future config persistence
  ```typescript
  // Placeholder for future config persistence.
  // When implemented, this will resolve XDG config path,
  // read/write config.json with Bun.file(),
  // and provide typed config accessors.
  export {};
  ```
- **No runtime behavior changes** — shell only
- **Verify**: `bun run typecheck`

#### Task 5.2 (OPTIONAL): Extract global state to `src/lib/state.ts`

- **Action**: CREATE (if budget allows — estimated +200 lines)
- **Deferred decision**: Skip this task if review budget is tight. The architectural benefit does not outweigh risk of breaking 115 tests.

If included:
- Extract `state` object, `goMenu()`, `goGame()`, `goResults()`, `goHistory()`, `goHistoryDetail()`, `updateLiveWpm()`, `handleKey()`, `handleQuit()` from `index.ts`
- `renderer` variable must be either passed as parameter or stored as module-level variable
- `index.ts` slimmed down to init + main loop
- **Risk: High** — state extraction touches every screen transition path
- **Verify**: Full manual play-through of all 3 modes + history navigation + detail view + quit

#### PR 5 Gate
```bash
bun run typecheck   # must pass
bun run test        # must pass
git diff --stat     # verify ≤ 400
```

---

### PR 6: `06f-cleanup` (≈35 Δ lines | Risk: Low)

Strip `screens.ts` to pure barrel re-exports. No file deletions — all extracted modules already exist.

#### Task 6.1: Strip `src/screens.ts` to pure barrel

- **Action**: MODIFY
- **Changes**:
  1. Remove the remaining `export function wordText(...)` function body
  2. Remove all remaining imports: `import type { Letter } from "./lib/types"`, `import type { TextChunk } from "@opentui/core"`, `import { CORRECT_FG, INCORRECT_FG, EXTRA_FG } from "./ui/theme"`
  3. Add: `export { wordText } from "./ui/word-display"` (barrel re-export)
  4. Also add `export { VERSION } from "./screens/menu"` if not already present (backward compat)
- **Final barrel content**:
  ```typescript
  export { VERSION, buildMenu } from "./screens/menu";
  export { buildGame } from "./screens/game";
  export { buildResults } from "./screens/results";
  export { buildHistory, buildEmptyHistory, buildHistoryDetail } from "./screens/history";
  export { wordText } from "./ui/word-display";
  export { shuffleWords } from "./lib/wordlists";
  export { SessionResult } from "./lib/types";
  ```
- **Critical**: Verify ALL 10 symbols are re-exported:

  | Symbol | Source | In Barrel? |
  |--------|--------|-----------|
  | `SessionResult` | lib/types.ts | ✅ |
  | `wordText` | ui/word-display.ts | ✅ |
  | `shuffleWords` | lib/wordlists.ts | ✅ |
  | `VERSION` | screens/menu.ts | ✅ (for backward compat) |
  | `buildMenu` | screens/menu.ts | ✅ |
  | `buildGame` | screens/game.ts | ✅ |
  | `buildResults` | screens/results.ts | ✅ |
  | `buildHistory` | screens/history.ts | ✅ |
  | `buildEmptyHistory` | screens/history.ts | ✅ |
  | `buildHistoryDetail` | screens/history.ts | ✅ |

#### Task 6.2: Update `src/index.ts` imports (if needed)

- **Action**: MODIFY (if any import paths changed — review only)
- **Expected**: No changes needed. `index.ts` imports from `"./screens"` which resolves through barrel.
- **Verify**: `bun run typecheck` resolves all imports

#### PR 6 Gate
```bash
bun run typecheck   # must pass
bun run test        # must pass
# Verify barrel is pure (should show only re-export statements):
grep -n "^function\|^const\|^interface\|^export interface\|^export const" src/screens.ts
# Output should be empty or only show export { ... } from "..." statements
git diff --stat     # ~35 Δ lines
git diff src/engine/  # zero (entire chain)
git diff src/screens.test.ts  # zero (entire chain)
```

---

## Structural Verification (After PR6 — Full Chain)

```bash
# 1. Typecheck + tests
bun run typecheck
bun run test

# 2. Barrel purity check — should show NO local defs
grep -n "^export function\|^export const\|^export interface\|^export type\|^const\|^function " src/screens.ts
# Expected output: nothing (or only re-export lines)

# 3. Engine untouched
git diff src/engine/ --name-only
# Expected: no output

# 4. Tests untouched
git diff src/screens.test.ts --name-only
# Expected: no output

# 5. File count matches target
ls src/screens/*.ts 2>/dev/null
# Expected: menu.ts game.ts results.ts history.ts
ls src/ui/*.ts 2>/dev/null
# Expected: theme.ts chart.ts word-display.ts
ls src/lib/*.ts 2>/dev/null
# Expected: types.ts db.ts wordlists.ts config.ts

# 6. Circular dependency check
# Manually verify import graph:
# ui/* → (no project deps except theme imports within ui/)
# lib/wordlists.ts → data/wordlists/english.json
# lib/types.ts → (no project deps)
# screens/* → ui/*, lib/types.ts
# screens.ts barrel → screens/*, ui/*, lib/*
# index.ts → screens.ts barrel, engine/*, lib/*
```

---

## Rollback Checkpoints

| PR | Rollback Trigger | Action |
|----|-----------------|--------|
| PR1 | Any test fails | `git revert HEAD` — foundational, must be clean |
| PR2 | Menu/game renders differently | `git revert HEAD` — verify extraction boundaries |
| PR3 | Results chart breaks | `git revert HEAD` — check chart module exports |
| PR4 | History navigation broken | `git revert HEAD` — verify barrel re-exports |
| PR5 | State extraction bug | `git revert HEAD` — defer state extraction |
| PR6 | Barrel breaks imports | `git revert HEAD` — restore last good screens.ts |

---

## Key Design Decisions (from sdd-design.md)

1. **SessionResult moved in PR1** (not PR5) — avoids circular dependency when screens/results.ts needs to import it
2. **`colored()` exported from `ui/word-display.ts`** — used by all screens for box-drawing borders and headers
3. **`screens.ts` stays as barrel** through all phases — test imports via `"./screens"` continue working
4. **State extraction deferred** — optional in PR5 only if budget allows (high risk, marginal benefit)
5. **`VERSION` included in barrel** for backward compatibility (trivial cost, safety net)
6. **`MODE_LABELS` NOT exported** — never exported by original, no consumer needs it
7. **No engine modifications** — `src/engine/` directory entirely untouched
8. **No test modifications** — `src/screens.test.ts` entirely untouched

---

*Generated from SDD proposal.md, spec.md, and design.md*
*Skill resolution: injected*
*Date: 2026-05-29*
