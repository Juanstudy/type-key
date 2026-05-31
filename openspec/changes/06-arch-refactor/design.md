# SDD Design: 06-arch-refactor — Structural Refactoring of type-key (Monkeyterm)

| Field | Value |
|-------|-------|
| **Change Key** | `06-arch-refactor` |
| **Status** | Design Approved |
| **Author** | SDD Design Executor |
| **Date** | 2026-05-29 |
| **Skill Resolution** | `injected` |
| **Strict TDD** | true — existing 115 tests are the spec |

---

## 1. Module Dependency Graph

### 1.1 Full Graph (Post-Refactoring)

```
                          ┌───────────────────────┐
                          │   @opentui/core (ext)  │
                          │   @crafter/charts (ext)│
                          └───────┬───────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
   ┌────────────┐         ┌──────────────┐       ┌──────────────┐
   │ ui/theme.ts│         │ lib/types.ts │       │ lib/db.ts    │
   │ (constants)│         │ (interfaces) │       │ (unchanged)  │
   └──────┬─────┘         └──────┬───────┘       └──────┬───────┘
          │                      │                      │
          ▼                      │                      │
   ┌──────────────┐             │                      │
   │ui/word-      │             │                      │
   │display.ts    │             │                      │
   │(colored,     │             │                      │
   │ wordText)    │             │                      │
   └──────┬───────┘             │                      │
          │                     │                      │
          ▼                     │                      │
   ┌──────────────┐            │                      │
   │  ui/chart.ts │            │                      │
   │ (buildWpm-   │            │                      │
   │  Chart, etc) │            │                      │
   └──────┬───────┘            │                      │
          │                    │                      │
          ▼                    ▼                      │
   ┌──────────────────────────────────┐              │
   │         screens/menu.ts          │              │
   │         screens/game.ts          │              │
   │         screens/results.ts       │              │
   │         screens/history.ts       │              │
   └──────────────┬───────────────────┘              │
                  │                                  │
                  ▼                                  ▼
   ┌──────────────────────────────────────────────────┐
   │              screens.ts (barrel)                  │
   │  re-exports: buildMenu, buildGame, buildResults,  │
   │  buildHistory, buildEmptyHistory, buildHistory-   │
   │  Detail, wordText, shuffleWords, SessionResult   │
   └──────────────────────┬───────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────┐
   │              index.ts                             │
   │  imports: screen builders + SessionResult from    │
   │  "./screens" barrel; engine/, lib/db directly     │
   └──────────────────────────────────────────────────┘
```

### 1.2 Edge Case: `ui/word-display.ts` Exporting `colored`

The `colored()` helper is a special case. It is used by:
- `wordText()` (internal to word-display)
- `buildMenu()` (directly — for title, mode header, selected options)
- `buildGame()` (directly — for header and footer)
- `buildResults()` (directly — for box-drawing borders)
- `buildHistory()` (directly — for box-drawing borders)
- `buildEmptyHistory()` (directly — for box-drawing borders)
- `buildHistoryDetail()` (directly — for box-drawing borders)

**Decision**: `colored()` MUST be exported from `ui/word-display.ts`. Every screen builder that uses it imports it directly.

```typescript
// ui/word-display.ts — note colored IS exported, not private
export function colored(text: string, color: string): TextChunk { ... }
export function wordText(word: { ... }): TextChunk[] { ... }
```

**Alternative considered**: Make `colored()` a standalone export in `ui/theme.ts`. Rejected because it's a display primitive (wraps text in a `TextChunk` with color), not a color constant. Keeping it with `wordText` groups related display-formatting logic.

### 1.3 Dependency Invariants

| Invariant | Enforcement |
|-----------|-------------|
| No `screens/` module imports from `engine/` | Review each import statement |
| No `ui/` module imports from `screens/` or `lib/` | Static check |
| No `lib/` module imports from `ui/` or `screens/` | Static check |
| No `screens.ts` barrel contains side-effect imports | Only `export { ... } from "..."` |
| No `import * as` namespace imports | Per AGENTS.md — use named imports |

---

## 2. Extraction Patterns

### 2.1 Pattern A: Copy → Replace with Import → Remove Original (Preferred)

This is the primary pattern for every extraction step. It ensures zero downtime for tests.

**Step-by-step for extracting e.g., `ui/theme.ts`:**

1. **COPY**: Create `src/ui/theme.ts` with the five color constants, exactly as in `screens.ts`.
2. **REPLACE WITH IMPORT**: In `src/screens.ts`, replace the inline definitions with:
   ```typescript
   import { CORRECT_FG, INCORRECT_FG, EXTRA_FG, SELECTED_FG, HEADER_FG } from "./ui/theme";
   ```
3. **VERIFY**: `bun run test && bun run typecheck` — must pass.
4. **REMOVE**: The constants are now defined in `ui/theme.ts` and imported. The original definition lines in `screens.ts` can be deleted (but only in the PR dedicated to that extraction — they stay as imports until PR6).

### 2.2 Pattern B: Barrel Migration Strategy

The barrel migration happens **gradually** across 6 PRs, not all at once.

**Phase 1 (PR1–PR4)**: `screens.ts` remains the primary file. Extracted functions are imported from new modules. The original function bodies and exports remain in `screens.ts`.

```typescript
// PR1 after extracting ui/theme.ts:
// screens.ts still has everything, but color constants are imported
import { CORRECT_FG, INCORRECT_FG, ... } from "./ui/theme";
// ... the rest of the file unchanged
```

**Phase 2 (PR2–PR4)**: Screen builders are extracted to `screens/*.ts`. `screens.ts` gains re-exports alongside the originals:

```typescript
// PR2: screens.ts still has buildMenu() body, but also re-exports:
export { buildMenu } from "./screens/menu";
// Duplicate! But OK because screens.ts still defines it and the re-export is
// redundant — TypeScript resolves to the local definition first.
// Actually no — if screens.ts has `export function buildMenu(...)` AND
// `export { buildMenu } from "./screens/menu"`, TypeScript errors:
// "Individual declarations in merged declaration 'buildMenu' must be all exported..."
```

**Correction for Pattern B**: The correct gradual approach is:

1. Extract the function body to `screens/menu.ts`.
2. In `screens.ts`, REPLACE the function body with `export { buildMenu } from "./screens/menu"`.
3. The original function body is removed from `screens.ts` at extraction time (not deferred).

So it's actually: **Extract → Re-export → Remove original**, done atomically per symbol.

This means:
- **PR2** extracts buildMenu and buildGame — both bodies are REMOVED from screens.ts and replaced with re-exports on the same PR.
- **PR3** extracts buildResults — body REMOVED from screens.ts, replaced with re-export.
- **PR4** extracts history builders — bodies REMOVED, replaced with re-exports.
- **PR6** removes remaining extracted imports + any leftover boilerplate, leaving only pure barrel exports.

**Why this is safe**: Tests import from `"./screens"` dynamically (`await import("./screens")`). The re-export resolves to the same function. TypeScript can trace the chain. The modular function receives identical inputs and produces identical outputs. Zero behavior change.

### 2.3 How to Handle `colored()` — Cross-cutting Concern

`colored()` is the most cross-cutting dependency:

| Consumer | File (after refactor) |
|----------|----------------------|
| `wordText()` | `ui/word-display.ts` (internal call) |
| `buildMenu()` | `screens/menu.ts` (imports `colored` from `ui/word-display.ts`) |
| `buildGame()` | `screens/game.ts` (imports `colored` from `ui/word-display.ts`) |
| `buildResults()` | `screens/results.ts` (imports `colored` from `ui/word-display.ts`) |
| `buildHistory()` | `screens/history.ts` (imports `colored` from `ui/word-display.ts`) |
| `buildEmptyHistory()` | `screens/history.ts` (imports `colored` from `ui/word-display.ts`) |
| `buildHistoryDetail()` | `screens/history.ts` (imports `colored` from `ui/word-display.ts`) |

**Extraction order matters**: `ui/word-display.ts` (including `colored`) must be extracted in **PR1** before any screen extraction in PR2–PR4. This is already the plan.

### 2.4 Edge Case: `VERSION` and `MODE_LABELS`

| Symbol | Usage | Extraction Decision |
|--------|-------|---------------------|
| `VERSION` | Used ONLY in `buildMenu()` | Move to `screens/menu.ts`. Export from menu.ts so barrel can re-export (optional — currently exported, preserve API surface) |
| `MODE_LABELS` | Used ONLY in `buildMenu()` | Move to `screens/menu.ts`. Do NOT export — it's an internal helper (currently not exported) |

### 2.5 Edge Case: `formatModeOption` and `formatDate`

These are internal helpers used by `buildHistory()` and `buildHistoryDetail()`.

| Symbol | Usage | Extraction Decision |
|--------|-------|---------------------|
| `formatModeOption` | Used in `buildHistory()` and `buildHistoryDetail()` | Move to `screens/history.ts`. Do NOT export — internal helper |
| `formatDate` | Used in `buildHistory()` and `buildHistoryDetail()` | Move to `screens/history.ts`. Do NOT export — internal helper |

---

## 3. Detailed Design for Each New File

### 3.1 `src/ui/theme.ts`

**Created in**: PR1 (06a-ui-primitives)

**Imports**: None (pure constants module)

**Exports**:
```typescript
export const CORRECT_FG = "#98c379";
export const INCORRECT_FG = "#e06c75";
export const EXTRA_FG = "#e06c75";
export const SELECTED_FG = "#e5c07b";
export const HEADER_FG = "#5c6370";
```

**Consumers**:
- `ui/word-display.ts` — imports all 5 constants
- `ui/chart.ts` — imports `HEADER_FG`
- `screens/menu.ts` — imports `HEADER_FG`, `SELECTED_FG`
- `screens/game.ts` — imports `HEADER_FG`
- `screens/results.ts` — imports `HEADER_FG`, `SELECTED_FG`
- `screens/history.ts` — imports `HEADER_FG`, `SELECTED_FG`

### 3.2 `src/ui/word-display.ts`

**Created in**: PR1 (06a-ui-primitives)

**Imports**:
```typescript
import type { TextChunk } from "@opentui/core";
import { CORRECT_FG, INCORRECT_FG, EXTRA_FG } from "./theme";
import type { Letter } from "../lib/types";
```

**Exports**:
```typescript
export function colored(text: string, color: string): TextChunk;
export function wordText(word: {
  letters: Letter[];
  isCompleted: boolean;
}): TextChunk[];
```

**Implementation notes**:
- `colored()` wraps text in `{ text, fg: color } as unknown as TextChunk` — same cast as current implementation
- `wordText()` uses same letter state switch (correct/incorrect/extra/untyped) with same color mapping
- Trailing space appended for incomplete words, same logic

**Consumers**:
- `screens/menu.ts` — imports `colored`
- `screens/game.ts` — imports `colored`, `wordText`
- `screens/results.ts` — imports `colored`
- `screens/history.ts` — imports `colored`
- `screens.ts` barrel — re-exports `wordText`
- `screens.test.ts` — imports `wordText` via barrel

### 3.3 `src/ui/chart.ts`

**Created in**: PR1 (06a-ui-primitives)

**Imports**:
```typescript
import { chart, renderToString, sparkArea } from "@crafter/charts";
import type { TextChunk } from "@opentui/core";
import { stringToStyledText } from "@opentui/core";
import { HEADER_FG } from "./theme";
```

**Exports**:
```typescript
export function downsample(data: number[], maxPoints: number): number[];
export function renderChartLines(lines: string[], contentWidth: number): TextChunk[];
export function buildWpmChart(
  wpmHistory: number[],
  options?: { height?: number; style?: "line" | "area"; label?: string }
): string;
export function padCenter(s: string, width: number): string;
```

**Implementation notes**:
- All functions are pure copies from `screens.ts` — identical implementation
- `buildWpmChart` has default style "line" with fallback to "area"
- `renderChartLines` produces box-drawing with `│` borders and `HEADER_FG`
- `downsample` uses evenly-spaced sampling when data exceeds maxPoints

**Consumers**:
- `screens/results.ts` — imports `buildWpmChart`, `renderChartLines`, `padCenter`
- `screens/history.ts` — imports `buildWpmChart`, `renderChartLines`

### 3.4 `src/lib/wordlists.ts`

**Created in**: PR1 (06a-ui-primitives)

**Imports**:
```typescript
import wordlist from "../data/wordlists/english.json";
```

**Exports**:
```typescript
export function shuffleWords(count: number): string[];
```

**Implementation notes**:
- Fisher-Yates shuffle followed by `slice(0, count)` — identical to current
- Typed as returning `string[]` (current implementation return type inferred as `string[]`)

**Consumers**:
- `screens.ts` barrel — re-exports `shuffleWords`
- `index.ts` — imports `shuffleWords` via barrel

### 3.5 `src/lib/types.ts` — Extended with SessionResult

**Modified in**: PR5 (06e-config-state) — interface added; existing types unchanged

**Addition**:
```typescript
export interface SessionResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  totalChars: number;
  errors: number;
}
```

**Existing types** (unchanged):
- `LetterState`, `Letter`, `Word`, `GameMode`, `TimeOption`, `WordCountOption`, `Language`, `GameConfig`, `StoredSession`, `NewSession`, `ModeStats`, `SessionAggregates`, `ScreenName`

**Consumers** of `SessionResult`:
- `screens/results.ts` — imports `SessionResult`
- `screens/history.ts` — imports `SessionResult`
- `screens.ts` barrel — re-exports `SessionResult`
- `index.ts` — imports `SessionResult` via barrel
- `screens.test.ts` — imports `SessionResult` via barrel

### 3.6 `src/screens/menu.ts`

**Created in**: PR2 (06b-menu-game)

**Imports**:
```typescript
import { StyledText, stringToStyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import { colored } from "../ui/word-display";
import { HEADER_FG, SELECTED_FG } from "../ui/theme";
```

**Exports**:
```typescript
export const VERSION = "1.0.0";
export function buildMenu(
  mode: "time" | "words",
  selectedIndex: number,
  options: number[],
): StyledText;
```

**Internal** (not exported):
```typescript
const MODE_LABELS = { time: "Time", words: "Words" } as const;
```

**Implementation notes**:
- `buildMenu()` code is a direct copy from `screens.ts` lines 83–119
- `colored()` calls reference the imported function from `ui/word-display.ts`
- No other external dependencies

### 3.7 `src/screens/game.ts`

**Created in**: PR2 (06b-menu-game)

**Imports**:
```typescript
import { StyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import type { Word } from "../lib/types";
import { colored, wordText } from "../ui/word-display";
import { HEADER_FG } from "../ui/theme";
```

**Exports**:
```typescript
export function buildGame(
  remainingSeconds: number,
  liveWpm: number,
  liveRawWpm: number,
  words: Word[],
  currentWordIndex: number,
): StyledText;
```

**Implementation notes**:
- Direct copy from `screens.ts` lines 121–155
- Uses `wordText()` for word rendering and `colored()` for header/footer

### 3.8 `src/screens/results.ts`

**Created in**: PR3 (06c-results)

**Imports**:
```typescript
import { StyledText, stringToStyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import { colored } from "../ui/word-display";
import { buildWpmChart, renderChartLines, padCenter } from "../ui/chart";
import { HEADER_FG, SELECTED_FG } from "../ui/theme";
import type { SessionResult } from "../lib/types";
```

**Exports**:
```typescript
export function buildResults(
  result: SessionResult,
  wpmHistory?: number[],
): StyledText;
```

**Implementation notes**:
- Direct copy from `screens.ts` lines 246–332
- Uses `buildWpmChart()`, `renderChartLines()`, `padCenter()` from chart module
- Uses `colored()` for box-drawing borders and title formatting
- `SessionResult` imported from `lib/types.ts`

### 3.9 `src/screens/history.ts`

**Created in**: PR4 (06d-history)

**Imports**:
```typescript
import { StyledText, stringToStyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import type { StoredSession, SessionAggregates } from "../lib/types";
import type { SessionResult } from "../lib/types";
import { colored } from "../ui/word-display";
import { buildWpmChart, renderChartLines, padCenter } from "../ui/chart";
import { HEADER_FG, SELECTED_FG } from "../ui/theme";
```

**Exports**:
```typescript
export function buildHistory(
  sessions: StoredSession[],
  aggregates: SessionAggregates,
  page: number,
  totalPages: number,
  selectedIndex: number,
): StyledText;

export function buildEmptyHistory(): StyledText;

export function buildHistoryDetail(session: StoredSession): StyledText;
```

**Internal** (not exported):
```typescript
function formatModeOption(session: StoredSession): string;
function formatDate(iso: string): string;
```

**Implementation notes**:
- `buildHistory()` — copy from `screens.ts` lines 353–455
- `buildEmptyHistory()` — copy from `screens.ts` lines 460–510
- `buildHistoryDetail()` — copy from `screens.ts` lines 514–594
- All three use `colored()` for box-drawing, `buildWpmChart()` / `renderChartLines()` for chart integration
- `SessionResult` imported only as type (for the `wpmHistory` parameter typing in `buildWpmChart`)
- Internal helpers `formatModeOption` and `formatDate` are module-scoped, NOT exported

### 3.10 `src/screens.ts` — Final Barrel (After PR6)

**Note**: `VERSION` is currently exported from `screens.ts`. The spec team should decide: does the barrel need to re-export `VERSION`? If `index.ts` never uses it directly (it doesn't), then it's safe to remove from the barrel. However, for maximum backward compatibility, the barrel should re-export everything the original exported.

**Final barrel** (after PR6):

```typescript
export { buildMenu } from "./screens/menu";
export { buildGame } from "./screens/game";
export { buildResults } from "./screens/results";
export { buildHistory, buildEmptyHistory, buildHistoryDetail } from "./screens/history";
export { wordText } from "./ui/word-display";
export { shuffleWords } from "./lib/wordlists";
export { SessionResult } from "./lib/types";
// VERSION is NOT re-exported — it was only used by buildMenu internally.
// If any test imports VERSION from "./screens", add:
// export { VERSION } from "./screens/menu";
```

**Critical note on `VERSION`**: The original `screens.ts` exports `VERSION`. After refactoring, if any consumer imports `VERSION` from `"./screens"`, it MUST still resolve. Let's verify:

- `index.ts`: Does NOT import `VERSION` — only imports screen builders and `SessionResult`
- `screens.test.ts`: Does NOT import `VERSION` — only imports `SessionResult` statically

**Decision**: `VERSION` does NOT need to be in the barrel. It's an internal detail of `screens/menu.ts`. However, for maximum safety, it's trivial to add `export { VERSION } from "./screens/menu"` to the barrel. Recommendation: **include it** for backward compatibility.

### 3.11 `src/lib/config.ts` (PR5 — Optional)

**Scope**: Shell module only. No runtime behavior changes. Ready for future config persistence.

```typescript
// Placeholder for future config persistence.
// When implemented, this will:
// - Resolve config path via XDG
// - Read/write config.json with Bun.file()
// - Provide typed config accessors
export {};
```

---

## 4. State Extraction Strategy (PR5)

### 4.1 Decision: Defer to PR5, Keep Optional

State extraction from `index.ts` is the riskiest PR because it touches every screen transition path. The plan:

**If review budget is tight** (estimated 350 lines for full state extraction):
- Extract ONLY: `SessionResult` move to `lib/types.ts`, barrel re-export
- Create `lib/config.ts` shell
- Defer state extraction to a follow-up

**If review budget permits**:
- Extract global state object and all screen transition functions to `src/lib/state.ts`

### 4.2 State Module Design (if extracted)

**File**: `src/lib/state.ts`

**Exports**:
```typescript
// State interface
export interface AppState { ... }

// State instance (mutable singleton — same as current pattern)
export const state: AppState = { ... };

// Screen transitions
export function goMenu(): void;
export function goGame(): void;
export function goResults(): void;
export function goHistory(): void;
export function goHistoryDetail(sessionId: number): void;

// Helpers
export function updateLiveWpm(): void;
export function handleKey(key: KeyEvent): void;
export function handleQuit(): void;

// Internal helpers
export function checkGameComplete(): void;
export function showGame(): void;
export function addTitleFont(): void;
export function removeTitleFont(): void;
export function getMenuOptions(): number[];
export function getMenuSelectedIndex(): number;
```

**Dependencies**:
```typescript
import { createCliRenderer, Text, ASCIIFont, StyledText } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import type { ScreenName, TimeOption } from "./types";
import type { StoredSession, SessionAggregates } from "./types";
import { initDB, saveSession, getSessions, getSession, getAggregates } from "./db";
import { TypingEngine } from "../engine/typing";
import { Timer } from "../engine/timer";
import { WPMCalculator } from "../engine/wpm";
import {
  shuffleWords, buildMenu, buildGame, buildResults,
  buildHistory, buildEmptyHistory, buildHistoryDetail,
  type SessionResult,
} from "../screens";
```

**After extraction**, `index.ts` becomes:
```typescript
import { createCliRenderer } from "@opentui/core";
import { handleKey, goMenu, initDB, ... } from "./lib/state";

// Main entry: init renderer, attach key listener, start
async function main(): Promise<void> {
  renderer = await createCliRenderer({ exitOnCtrlC: false });
  renderer.root.justifyContent = "center";
  renderer.root.alignItems = "center";
  (renderer.keyInput as unknown as { on(...): void }).on("keypress", handleKey);
  process.on("SIGINT", handleQuit);
  initDB();
  goMenu();
}
```

**Risk**: High. The `renderer` variable is shared mutable state that screen transitions depend on. `handleKey` closure captures `state`. If extraction is done, `renderer` must be either:
- Passed as a parameter to screen transition functions
- Or stored in state module as a module-level variable (same pattern as current)

**Recommendation**: Defer to follow-up. The architectural benefit of separating `index.ts` doesn't outweigh the risk of breaking 115 tests. The current code works.

---

## 5. Risk Mitigations (Per PR)

### PR1: 06a-ui-primitives

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Color constant typo | Low | Medium | Copy-paste exact hex values; verify with diff |
| Chart functions depend on `@crafter/charts` API changes | Very Low | High | Functions are pure copies; `@crafter/charts` is a pinned dependency |
| `shuffleWords` import path to `english.json` wrong | Low | Medium | Use relative path from `lib/` to `data/`: `../data/wordlists/english.json` |
| `colored()` not exported but screens need it | Low | High | Export `colored()` from `ui/word-display.ts` — verify all callers can import |

**Verification**: `bun run test && bun run typecheck` — must pass before committing.

### PR2: 06b-menu-game

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `buildMenu` missing `VERSION` or `MODE_LABELS` | Low | Low | Include both in `menu.ts`; `VERSION` is exported, `MODE_LABELS` is private |
| `buildGame` missing import for `Word` type | Low | Medium | Import `type { Word }` from `../lib/types` |
| `buildGame` function signature changes | Very Low | High | Copy exact signature from `screens.ts` — verify with diff |
| Re-export conflicts with local definition | Low | Medium | Remove local definition at extraction time (see Pattern B correction) |

**Verification**: `bun run test && bun run typecheck` — also visual check: `bun run dev` and verify menu + game render.

### PR3: 06c-results

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `buildResults` uses `SessionResult` — interface must be importable | Low | High | Import from `../lib/types` (SessionResult is added in PR5, but for PR3 it's still in screens.ts) |

**⚠️ Critical sequencing issue**: `SessionResult` is currently defined in `screens.ts`. If we extract `buildResults` in PR3 but `SessionResult` moves to `lib/types.ts` in PR5, then `screens/results.ts` in PR3 needs to either:
- a) Import `SessionResult` from `../screens` (backward reference to barrel) — **creates circular dependency**
- b) Import `SessionResult` from `../lib/types` — but the interface hasn't been moved there yet
- c) Keep `SessionResult` definition in `screens/results.ts` temporarily

**Resolution**: Either:
- **Option A**: Move `SessionResult` to `lib/types.ts` in PR1 (before any screen extraction) — this is the cleanest approach
- **Option B**: Define `SessionResult` in both `lib/types.ts` and `screens.ts` during transition (duplicate — bad)
- **Option C**: PR3 imports from `../screens` via a path that won't cause cycles (but `screens/results.ts` importing from `../screens` would import the barrel which re-exports `buildResults`... circular!)

**Decision: Move `SessionResult` in PR1, not PR5.** This resolves the cycle.

Updated PR plan:
- **PR1**: Extract UI primitives + wordlists + ALSO move `SessionResult` to `lib/types.ts` with barrel re-export
- **PR2–PR4**: Screen builders can safely import `SessionResult` from `../lib/types`
- **PR5**: Config shell + (optional) state extraction
- **PR6**: Barrel cleanup

This is a minor reorder but eliminates the biggest risk.

**Verification**: `bun run test && bun run typecheck` — also visual check of results screen rendering with chart.

### PR4: 06d-history

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| History is the largest extraction (~250 lines) | Medium | Medium | Review carefully; use `git diff` to verify no lines dropped |
| `formatModeOption` and `formatDate` must NOT be exported | Low | Medium | Double-check export statement only exports 3 builders |
| Chart import missing | Low | Medium | Verify `buildWpmChart`, `renderChartLines` are imported from `../ui/chart` |
| buildHistory uses `buildWpmChart` with `style: "area"` option | Low | Medium | Verify chart.ts exports work with both style options |

**Verification**: `bun run test && bun run typecheck` — also visual check: navigate to history, verify session list, detail view, empty state.

### PR5: 06e-config-state

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| State extraction introduces runtime bug | Medium | High | Defer if budget tight. If done, add smoke test after extraction |
| `renderer` variable not accessible from state module | High | High | Either pass as parameter or store at module level |
| Keyboard handler closure breaks | Medium | High | Keep `handleKey` in state module; verify all key paths work |

**Verification**: Full manual play-through of all 3 modes (time, words) + history navigation + detail view + quit.

### PR6: 06f-cleanup

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Missing export in barrel | Low | High | Use checklist (section 9.2 of spec) to verify every symbol |
| `VERSION` not in barrel but needed | Very Low | Low | Add `export { VERSION } from "./screens/menu"` for safety |
| Stale import left in screens.ts | Low | Low | Run `bun run typecheck` — unused imports cause errors with strict settings |

**Verification**: Export completeness checklist + full test suite + typecheck + manual visual check.

---

## 6. Verification Approach (Per PR)

### 6.1 Mandatory Gates

Every PR MUST pass these before commit:

```
# 1. Full test suite
bun run test        # exit code 0, all ~115 tests pass

# 2. Typecheck
bun run typecheck   # exit code 0, zero type errors

# 3. Diff review
git diff --stat     # verify Δ lines ≤ 400
git diff src/engine/    # verify zero engine changes (should produce no output)
git diff src/screens.test.ts  # verify zero test file changes (should produce no output)
```

### 6.2 Recommended Smoke Tests

After PR3, PR4, PR5, PR6:

```
# 4. Manual visual check
bun run dev         # verify menu renders → start game → type → results render → history renders
```

### 6.3 Export Completeness Checklist (for PR6)

| Symbol | Original `screens.ts` | Barrel Re-export | Source Module |
|--------|----------------------|------------------|---------------|
| `SessionResult` | ✅ Exported | ✅ | `lib/types.ts` |
| `wordText` | ✅ Exported | ✅ | `ui/word-display.ts` |
| `shuffleWords` | ✅ Exported | ✅ | `lib/wordlists.ts` |
| `VERSION` | ✅ Exported | ✅ (recommended) | `screens/menu.ts` |
| `buildMenu` | ✅ Exported | ✅ | `screens/menu.ts` |
| `buildGame` | ✅ Exported | ✅ | `screens/game.ts` |
| `buildResults` | ✅ Exported | ✅ | `screens/results.ts` |
| `buildHistory` | ✅ Exported | ✅ | `screens/history.ts` |
| `buildEmptyHistory` | ✅ Exported | ✅ | `screens/history.ts` |
| `buildHistoryDetail` | ✅ Exported | ✅ | `screens/history.ts` |

### 6.4 Structural Verification (After PR6)

```bash
# Verify barrel is pure (no function/variable/interface definitions)
grep -n "^function\|^const\|^interface\|^export interface\|^export const" src/screens.ts
# Should only show export { ... } from "..."
# If any above, refactoring is incomplete

# Verify zero engine modifications
git diff src/engine/ --name-only
# Should produce no output

# Verify zero test file changes
git diff src/screens.test.ts --name-only
# Should produce no output
```

### 6.5 Test Identity Verification

The most important verification: do the tests produce identical results?

```bash
# Before refactoring (baseline)
git stash
bun run test > baseline.txt
git stash pop

# After each PR
bun run test > current.txt
diff baseline.txt current.txt
# Should show zero differences (or only timing/hash differences in random tests)
```

Note: `shuffleWords` uses `Math.random()`, so tests that depend on word order may produce different output across runs even without refactoring. The key is that the function contract is preserved (returns correct count of strings, etc.).

---

## 7. Updated PR Plan (with SessionResult Move in PR1)

| PR | Name | Files Created | Key Actions | Risk |
|----|------|--------------|-------------|------|
| **PR1** | `06a-ui-primitives` | `ui/theme.ts`, `ui/chart.ts`, `ui/word-display.ts`, `lib/wordlists.ts` | Extract UI + wordlist + **move SessionResult to lib/types.ts**. Update screens.ts imports. | Low |
| **PR2** | `06b-menu-game` | `screens/menu.ts`, `screens/game.ts` | Extract buildMenu + buildGame. Add barrel re-exports. | Low |
| **PR3** | `06c-results` | `screens/results.ts` | Extract buildResults. Add barrel re-export. | Low |
| **PR4** | `06d-history` | `screens/history.ts` | Extract all history builders. Add barrel re-exports. | Low-Med |
| **PR5** | `06e-config-state` | `lib/config.ts` (optional: + `lib/state.ts`) | Config shell. Deferred state extraction (if budget allows). | Med |
| **PR6** | `06f-cleanup` | None | Strip screens.ts to pure barrel. | Low |

**Line count estimate (per PR Δ)**:

| PR | New Files | Modified Files | Est. Δ Lines |
|----|-----------|----------------|-------------|
| PR1 | 4 files (~130 lines) | 1 file (~12 lines import changes) | ~142 |
| PR2 | 2 files (~85 lines) | 1 file (~4 lines re-exports + body removal) | ~89 |
| PR3 | 1 file (~87 lines) | 1 file (~3 lines re-export + body removal) | ~90 |
| PR4 | 1 file (~250 lines) | 1 file (~4 lines re-exports + body removal) | ~254 |
| PR5 | 1–2 files (~20 lines config + optional ~200 lines state) | 1–2 files (barrel re-export + index.ts slimming) | ~20–250 |
| PR6 | 0 | 1 file (barrel conversion only) | ~35 |

**Review budget check**: All PRs are ≤ 400 Δ lines. PR4 is the heaviest at ~254 lines. PR5 is variable — if state extraction adds ~250 lines, it stays under budget.

---

## 8. Rollout Strategy

### 8.1 Branch Strategy

Per Git workflow (Opción A):
- All work on `dev` branch
- Each PR merges to `dev` sequentially
- After PR6, `dev` → `main` merge

```bash
git checkout dev
<PR1 commits>
bun run test && bun run typecheck
git commit -m "06a: extract UI primitives + SessionResult to lib/types"
<PR2 commits>
bun run test && bun run typecheck
git commit -m "06b: extract menu and game screens"
<PR3-6 similarly>
```

### 8.2 Rollback Checkpoints

| Checkpoint | Condition | Action |
|-----------|-----------|--------|
| After PR1 | Any test fails | `git revert HEAD` — PR1 is foundational, must be clean |
| After PR2 | Menu/game renders differently | `git revert HEAD` — verify extraction boundaries |
| After PR3 | Results screen chart breaks | `git revert HEAD` — check chart module exports |
| After PR4 | History navigation broken | `git revert HEAD` — check barrel re-exports |
| After PR5 | State extraction introduces bug | `git revert HEAD` — defer state extraction |
| After PR6 | Barrel breaks import | `git revert HEAD` — restore last good screens.ts |

### 8.3 Data Safety

- No database schema changes — `results.db` is untouched
- No config file changes — `config.ts` is a shell (if PR5 created)
- No wordlist changes — `english.json` is untouched
- No engine changes — `engine/` directory not modified

---

## 9. Trade-offs and Design Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|------------|
| `SessionResult` move timing | PR1 vs PR5 | **PR1** | Avoids circular dependency when screens/ results.ts needs to import it |
| `colored()` location | `ui/theme.ts` vs `ui/word-display.ts` | **`ui/word-display.ts`** | It's a display primitive (text wrapping), not a color constant. Grouped with `wordText` as display formatting. |
| `VERSION` in barrel | Include vs exclude | **Include** | Trivial cost, backward compatibility safety |
| Barrel be pure in PR6 only | Gradual vs atomic | **Gradual** | Each PR extracts and removes function bodies atomically. PR6 removes remaining imports/boilerplate. |
| State extraction in PR5 | Do vs defer | **Defer if budget tight** | Risk/reward: state extraction adds architectural clarity but may break 115 tests. Config shell alone is safe. |
| `MODE_LABELS` export | Export vs private | **Private** | Never exported by original `screens.ts`. No consumer needs it. |

---

## 10. Summary of File Operations

| File | Operation | PR |
|------|-----------|----|
| `src/ui/theme.ts` | CREATE | PR1 |
| `src/ui/chart.ts` | CREATE | PR1 |
| `src/ui/word-display.ts` | CREATE | PR1 |
| `src/lib/wordlists.ts` | CREATE | PR1 |
| `src/lib/types.ts` | MODIFY (+SessionResult) | PR1 |
| `src/screens/menu.ts` | CREATE | PR2 |
| `src/screens/game.ts` | CREATE | PR2 |
| `src/screens/results.ts` | CREATE | PR3 |
| `src/screens/history.ts` | CREATE | PR4 |
| `src/lib/config.ts` | CREATE (shell) | PR5 |
| `src/lib/state.ts` | CREATE (optional) | PR5 |
| `src/screens.ts` | MODIFY (→ barrel) | PR1–PR6 |
| `src/index.ts` | MODIFY (imports) | PR6 |
| `src/engine/*` | UNCHANGED | — |
| `src/screens.test.ts` | UNCHANGED | — |

---

## 11. Appendix: Per-Function Extraction Tracker

| Function/Constant | Current File | Destination File | PR | Status |
|------------------|-------------|-----------------|----|--------|
| `CORRECT_FG` | `screens.ts:22` | `ui/theme.ts` | PR1 | Planned |
| `INCORRECT_FG` | `screens.ts:24` | `ui/theme.ts` | PR1 | Planned |
| `EXTRA_FG` | `screens.ts:26` | `ui/theme.ts` | PR1 | Planned |
| `SELECTED_FG` | `screens.ts:28` | `ui/theme.ts` | PR1 | Planned |
| `HEADER_FG` | `screens.ts:30` | `ui/theme.ts` | PR1 | Planned |
| `colored()` | `screens.ts:33` | `ui/word-display.ts` | PR1 | Planned |
| `wordText()` | `screens.ts:36` | `ui/word-display.ts` | PR1 | Planned |
| `shuffleWords()` | `screens.ts:59` | `lib/wordlists.ts` | PR1 | Planned |
| `SessionResult` | `screens.ts:14` | `lib/types.ts` | PR1 | **Moved from PR5** |
| `VERSION` | `screens.ts:75` | `screens/menu.ts` | PR2 | Planned |
| `MODE_LABELS` | `screens.ts:77` | `screens/menu.ts` (private) | PR2 | Planned |
| `buildMenu()` | `screens.ts:79` | `screens/menu.ts` | PR2 | Planned |
| `buildGame()` | `screens.ts:117` | `screens/game.ts` | PR2 | Planned |
| `downsample()` | `screens.ts:155` | `ui/chart.ts` | PR1 | Planned |
| `renderChartLines()` | `screens.ts:180` | `ui/chart.ts` | PR1 | Planned |
| `buildWpmChart()` | `screens.ts:197` | `ui/chart.ts` | PR1 | Planned |
| `padCenter()` | `screens.ts:236` | `ui/chart.ts` | PR1 | Planned |
| `buildResults()` | `screens.ts:242` | `screens/results.ts` | PR3 | Planned |
| `formatModeOption()` | `screens.ts:332` | `screens/history.ts` (private) | PR4 | Planned |
| `formatDate()` | `screens.ts:342` | `screens/history.ts` (private) | PR4 | Planned |
| `buildHistory()` | `screens.ts:349` | `screens/history.ts` | PR4 | Planned |
| `buildEmptyHistory()` | `screens.ts:456` | `screens/history.ts` | PR4 | Planned |
| `buildHistoryDetail()` | `screens.ts:510` | `screens/history.ts` | PR4 | Planned |
| Imports → barrel only | `screens.ts:1-8` | `screens.ts` (→ re-exports) | PR6 | Planned |
| State + transitions | `index.ts` | `lib/state.ts` (optional) | PR5 | Deferred |

---

*End of SDD Design Document.*
*Skill resolution: injected*
*Next step: Generate tasks from this design and begin PR1 implementation.*
