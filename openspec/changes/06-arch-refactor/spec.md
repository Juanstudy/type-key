# Architecture Specification — 06-arch-refactor

## Purpose

Refactor the monolithic `src/screens.ts` (~620 lines) and clarify `src/index.ts` boundaries into a modular file hierarchy with one screen builder per file, extracted UI primitives, extracted data logic, and a barrel re-export file. All existing behavior MUST be preserved: every test, every screen render, every import path that consumers (`index.ts`, `screens.test.ts`) rely on.

This specification defines the post-refactoring structural contract. It does not describe implementation steps (those are in the implementation plan within this document).

---

## 1. Module Layout

The final source tree MUST match this layout exactly:

```
src/
├── screens/
│   ├── menu.ts           — buildMenu(), VERSION
│   ├── game.ts           — buildGame()
│   ├── results.ts        — buildResults()
│   └── history.ts        — buildHistory(), buildEmptyHistory(), buildHistoryDetail()
├── engine/               [UNCHANGED]
│   ├── typing.ts
│   ├── timer.ts
│   └── wpm.ts
├── lib/
│   ├── types.ts          — [UNCHANGED + SessionResult interface added]
│   ├── db.ts             [UNCHANGED]
│   └── wordlists.ts      — shuffleWords() extracted from screens.ts
├── ui/
│   ├── theme.ts          — color constant definitions
│   ├── chart.ts          — buildWpmChart(), renderChartLines(), downsample(), padCenter()
│   └── word-display.ts   — wordText(), colored()
├── data/wordlists/
│   └── english.json      [UNCHANGED]
├── screens.ts            — barrel file: re-exports all public symbols
├── screens.test.ts       [UNCHANGED — imports from ./screens barrel]
└── index.ts              — imports from new module locations; state extraction deferred
```

### 1.1 Structural Invariants

The system MUST satisfy these invariants after the refactoring:

1. **No circular dependencies**: The dependency graph MUST be acyclic. The ordering MUST be: `ui/` → no project deps → `lib/` → no screen deps → `screens/` → `screens.ts` barrel → `index.ts`.
2. **No dead code in barrel**: `screens.ts` MUST contain only re-export statements. No function definitions, no variable definitions, no imports with side effects.
3. **Co-location**: Screen builder functions MUST live in `src/screens/`. UI primitives MUST live in `src/ui/`. Data/utility logic MUST live in `src/lib/`. Engine logic MUST stay in `src/engine/`.
4. **No namespace imports**: Per AGENTS.md, `import * as` namespace imports SHALL NOT be used. All imports MUST be named imports.
5. **Zero lines of commented-out or dead code** in refactored files.
6. **engine/ directory MUST be untouched**: No files in `engine/` are added, removed, or modified.

---

## 2. Domain: Screen Builder Modules

Each screen builder module exports a single screen-building function (or multiple for related screens). All screen builders accept the same parameters and return a `StyledText` instance identically to the current implementation.

### 2.1 Requirement: screens/menu.ts Exports

The module `src/screens/menu.ts` MUST export:

- `buildMenu(mode: "time" | "words", selectedIndex: number, options: number[]): StyledText`

#### Scenario: Menu renders identically to current

- GIVEN the module is imported from `./screens/menu.ts`
- WHEN `buildMenu("time", 1, [15, 30, 60, 120])` is called
- THEN the returned `StyledText` MUST have identical chunk text and chunk colors to the current `buildMenu` output
- AND the output MUST contain `"Monkeyterm v1.0.0"`, mode label, `"▸"` at the selected option, and hint text

### 2.2 Requirement: screens/game.ts Exports

The module `src/screens/game.ts` MUST export:

- `buildGame(remainingSeconds: number, liveWpm: number, liveRawWpm: number, words: Word[], currentWordIndex: number): StyledText`

#### Scenario: Game renders identically to current

- GIVEN the module is imported from `./screens/game.ts`
- WHEN `buildGame(25, 45, 50, words, 2)` is called with sample words
- THEN the returned `StyledText` MUST have identical chunk text and colors to the current `buildGame` output
- AND the output MUST contain timer, WPM display, word lines, and footer

### 2.3 Requirement: screens/results.ts Exports

The module `src/screens/results.ts` MUST export:

- `buildResults(result: SessionResult, wpmHistory?: number[]): StyledText`

#### Scenario: Results renders identically to current

- GIVEN the module is imported from `./screens/results.ts`
- WHEN `buildResults(sampleResult, [30, 40, 50])` is called
- THEN the returned `StyledText` MUST have identical chunk text and colors to the current `buildResults` output
- AND the chart MUST appear when `wpmHistory.length >= 2`
- AND the chart MUST be absent when `wpmHistory` is empty

### 2.4 Requirement: screens/history.ts Exports

The module `src/screens/history.ts` MUST export:

- `buildHistory(sessions: StoredSession[], aggregates: SessionAggregates, page: number, totalPages: number, selectedIndex: number): StyledText`
- `buildEmptyHistory(): StyledText`
- `buildHistoryDetail(session: StoredSession): StyledText`

#### Scenario: History screens render identically to current

- GIVEN the module is imported from `./screens/history.ts`
- WHEN each builder is called with the same parameters as in `screens.test.ts`
- THEN each returned `StyledText` MUST be identical to the current implementation's output

#### Scenario: formatModeOption and formatDate are module-private

- GIVEN `src/screens/history.ts`
- THEN `formatModeOption` and `formatDate` MUST NOT be exported (they are internal helpers)

---

## 3. Domain: UI Primitive Modules

### 3.1 Requirement: ui/theme.ts Exports

The module `src/ui/theme.ts` MUST export five color constants:

```
CORRECT_FG: "#98c379"
INCORRECT_FG: "#e06c75"
EXTRA_FG: "#e06c75"
SELECTED_FG: "#e5c07b"
HEADER_FG: "#5c6370"
```

#### Scenario: Theme constants match original values

- GIVEN `import { CORRECT_FG, INCORRECT_FG, EXTRA_FG, SELECTED_FG, HEADER_FG } from "./ui/theme"`
- WHEN each is read
- THEN each value MUST equal the corresponding constant from the original `screens.ts`

### 3.2 Requirement: ui/word-display.ts Exports

The module `src/ui/word-display.ts` MUST export:

- `colored(text: string, color: string): TextChunk`
- `wordText(word: { letters: Letter[]; isCompleted: boolean }): TextChunk[]`

#### Scenario: wordText produces identical chunks

- GIVEN `import { wordText } from "./ui/word-display"`
- WHEN called with the same parameters as `screens.test.ts` provides
- THEN the returned chunks MUST be identical to the current implementation
- AND correct letters MUST use `CORRECT_FG`, incorrect letters MUST use `INCORRECT_FG`, extra letters MUST use `EXTRA_FG`
- AND a trailing space MUST be appended for incomplete words

### 3.3 Requirement: ui/chart.ts Exports

The module `src/ui/chart.ts` MUST export:

- `buildWpmChart(wpmHistory: number[], options?: { height?: number; style?: "line" | "area"; label?: string }): string`
- `renderChartLines(lines: string[], contentWidth: number): TextChunk[]`
- `downsample(data: number[], maxPoints: number): number[]`
- `padCenter(s: string, width: number): string`

#### Scenario: Chart functions produce identical output

- GIVEN `import { buildWpmChart, renderChartLines, downsample, padCenter } from "./ui/chart"`
- WHEN each is called with the same parameters as the current implementation
- THEN each function's output MUST be identical to the current implementation's output

---

## 4. Domain: Library Modules

### 4.1 Requirement: lib/wordlists.ts Exports

The module `src/lib/wordlists.ts` MUST export:

- `shuffleWords(count: number): string[]`

#### Scenario: shuffleWords produces same contract

- GIVEN `import { shuffleWords } from "./lib/wordlists"`
- WHEN called with a count
- THEN it MUST return an array of exactly `count` strings (or fewer if wordlist is exhausted)
- AND every element MUST be a non-empty string from the wordlist

### 4.2 Requirement: lib/types.ts Exports

The module `src/lib/types.ts` MUST export all existing types PLUS:

- `SessionResult` — the interface currently defined in `screens.ts`

#### Scenario: SessionResult is importable from lib/types

- GIVEN `import type { SessionResult } from "./lib/types"`
- WHEN the type is used
- THEN it MUST match the original `SessionResult` interface shape:
  - `wpm: number`, `rawWpm: number`, `accuracy: number`, `correctChars: number`, `totalChars: number`, `errors: number`

#### Scenario: lib/types.ts adds no breaking changes

- GIVEN all existing types in `lib/types.ts`
- THEN they MUST remain unchanged — no properties removed, no type signatures altered

---

## 5. Domain: Barrel File (screens.ts)

The file `src/screens.ts` MUST become a pure barrel file containing only re-export statements.

### 5.1 Requirement: All public symbols re-exported

The barrel MUST re-export ALL of the following symbols:

| Symbol | Source Module |
|--------|---------------|
| `SessionResult` | `lib/types.ts` |
| `buildMenu` | `screens/menu.ts` |
| `buildGame` | `screens/game.ts` |
| `buildResults` | `screens/results.ts` |
| `buildHistory` | `screens/history.ts` |
| `buildEmptyHistory` | `screens/history.ts` |
| `buildHistoryDetail` | `screens/history.ts` |
| `wordText` | `ui/word-display.ts` |
| `shuffleWords` | `lib/wordlists.ts` |

#### Scenario: All symbols importable from barrel

- GIVEN `import { buildMenu, buildGame, buildResults, buildHistory, buildEmptyHistory, buildHistoryDetail, wordText, shuffleWords, SessionResult } from "./screens"`
- WHEN TypeScript typechecks the file
- THEN all symbols MUST resolve correctly without errors

#### Scenario: Existing tests import from ./screens without changes

- GIVEN `src/screens.test.ts` and `src/index.ts` import from `"./screens"`
- WHEN typecheck is run
- THEN all imports MUST resolve — no changes to test files or index.ts import paths are needed for resolution

### 5.2 Requirement: Barrel file contains no function definitions

The barrel file (`src/screens.ts`) MUST contain only `export { ... } from "..."` statements. It MUST NOT contain:

- Function definitions (`function`)
- Interface/type definitions (`interface`, `type`)
- Variable/constant definitions (`const`, `let`, `var`)
- Import statements with side effects
- Any executable code

#### Scenario: Barrel has zero LOC of executable code

- GIVEN the final `src/screens.ts`
- WHEN parsed for function/interface/variable definitions
- THEN none MUST be found — only re-export statements

---

## 6. Domain: index.ts Import Resolution

### 6.1 Requirement: index.ts imports resolve to new locations

The file `src/index.ts` MUST import all screen builders and types from `"./screens"`. After refactoring, all symbols MUST still resolve correctly through the barrel.

#### Scenario: All index.ts imports compile

- GIVEN `src/index.ts`
- WHEN `bun run typecheck` is executed
- THEN all imports from `"./screens"` MUST resolve without errors

### 6.2 Requirement: Internal helpers not exposed

The following functions are internal to their modules and MUST NOT be exported or imported outside them:

- `formatModeOption` (private to `screens/history.ts`)
- `formatDate` (private to `screens/history.ts`)
- `colored` (private to `ui/word-display.ts` — also available as export for testability)
- `VERSION` (used only in `buildMenu`, module-private to `screens/menu.ts` — optional export for testability)

---

## 7. Domain: Dependency Constraints

### 7.1 Requirement: No circular dependencies

The dependency graph MUST be acyclic. The allowed import directions are:

```
ui/theme.ts        → (no project imports)
ui/word-display.ts → ui/theme.ts
ui/chart.ts        → ui/theme.ts
lib/wordlists.ts   → data/wordlists/english.json
lib/types.ts       → (no project imports)
screens/menu.ts    → ui/theme.ts
screens/game.ts    → ui/word-display.ts, ui/theme.ts
screens/results.ts → ui/chart.ts, ui/theme.ts, lib/types.ts
screens/history.ts → ui/chart.ts, ui/theme.ts, lib/types.ts
screens.ts barrel  → screens/*, lib/wordlists.ts, lib/types.ts
index.ts           → screens.ts barrel, engine/*, lib/*
```

#### Scenario: Dependency graph is clean

- GIVEN the full module graph
- WHEN checked for circular dependencies
- THEN no cycles MUST exist

---

## 8. Implementation Plan: 6 Chained PRs

This section specifies the acceptance criteria for each PR in the implementation sequence.

### PR 1: `06a-ui-primitives` — Extract UI primitives and wordlist

**Acceptance criteria:**

1. `src/ui/theme.ts` exists and exports `CORRECT_FG`, `INCORRECT_FG`, `EXTRA_FG`, `SELECTED_FG`, `HEADER_FG` with original hex values.
2. `src/ui/chart.ts` exists and exports `buildWpmChart`, `renderChartLines`, `downsample`, `padCenter`.
3. `src/ui/word-display.ts` exists and exports `colored`, `wordText`.
4. `src/lib/wordlists.ts` exists, imports `wordlist` from `./data/wordlists/english.json`, and exports `shuffleWords`.
5. `src/screens.ts` still exports all 10 public symbols (the barrel is not yet pure — function bodies remain). Imports the extracted functions instead of defining them inline.
6. `bun run test` passes (exit code 0).
7. `bun run typecheck` passes (exit code 0).

### PR 2: `06b-menu-game` — Extract menu and game screens

**Acceptance criteria:**

1. `src/screens/menu.ts` exists and exports `buildMenu`. Contains `VERSION` constant. Imports `colored` from `../ui/word-display`, color constants from `../ui/theme`.
2. `src/screens/game.ts` exists and exports `buildGame`. Imports `wordText` from `../ui/word-display`, color constants from `../ui/theme`.
3. `src/screens.ts` adds re-exports: `export { buildMenu } from "./screens/menu"`, `export { buildGame } from "./screens/game"`. Function bodies remain in `screens.ts` for other builders.
4. `bun run test` passes.
5. `bun run typecheck` passes.

### PR 3: `06c-results` — Extract results screen

**Acceptance criteria:**

1. `src/screens/results.ts` exists and exports `buildResults`. Imports `buildWpmChart`, `renderChartLines`, `padCenter` from `../ui/chart`, color constants from `../ui/theme`, `SessionResult` from `../lib/types`.
2. `src/screens.ts` adds re-export: `export { buildResults } from "./screens/results"`. Function body for `buildResults` removed from `screens.ts`.
3. `bun run test` passes.
4. `bun run typecheck` passes.

### PR 4: `06d-history` — Extract history screens

**Acceptance criteria:**

1. `src/screens/history.ts` exists and exports `buildHistory`, `buildEmptyHistory`, `buildHistoryDetail`.
2. Internal helpers `formatModeOption` and `formatDate` are NOT exported.
3. Module imports `buildWpmChart`, `renderChartLines` from `../ui/chart`, color constants from `../ui/theme`, types from `../lib/types`.
4. `src/screens.ts` adds re-exports: `export { buildHistory, buildEmptyHistory, buildHistoryDetail } from "./screens/history"`. Function bodies removed from `screens.ts`.
5. `bun run test` passes.
6. `bun run typecheck` passes.

### PR 5: `06e-config-state` — SessionResult move + state extraction

**Acceptance criteria:**

1. `SessionResult` interface is defined in `src/lib/types.ts` and REMOVED from `src/screens.ts` barrel.
2. Barrel re-exports `SessionResult` from `"./lib/types"`.
3. `src/lib/config.ts` exists as a shell module (ready for future config persistence — no runtime behavior changes).
4. If state extraction is included: global mutable state and screen transition functions (`goMenu`, `goGame`, `goResults`, `goHistory`, `goHistoryDetail`, `updateLiveWpm`) are extracted from `index.ts` into a dedicated module.
5. `bun run test` passes.
6. `bun run typecheck` passes.

### PR 6: `06f-cleanup` — Barrel conversion + import cleanup

**Acceptance criteria:**

1. `src/screens.ts` contains ONLY re-export statements. No function definitions, no interface definitions, no variable definitions.
2. The final barrel re-exports exactly these symbols:

```typescript
export { buildMenu } from "./screens/menu";
export { buildGame } from "./screens/game";
export { buildResults } from "./screens/results";
export { buildHistory, buildEmptyHistory, buildHistoryDetail } from "./screens/history";
export { wordText } from "./ui/word-display";
export { shuffleWords } from "./lib/wordlists";
export { SessionResult } from "./lib/types";
```

3. All import paths in `src/index.ts` and `src/screens.test.ts` resolve without changes.
4. `bun run test` passes.
5. `bun run typecheck` passes.
6. Review budget per PR ≤ 400 changed lines (target under threshold).

---

## 9. Verification Strategy

### 9.1 Test Verification

After EVERY PR, the following verification steps MUST execute and pass:

1. **Full test suite**: `bun run test` — exit code 0, all ~115 tests pass
2. **Typecheck**: `bun run typecheck` — exit code 0, zero type errors
3. **Manual visual spot-check**: Run `bun run dev` and verify each screen (menu, game, results, history, history detail) renders correctly

### 9.2 Structural Verification

After PR 6 (final state), additionally verify:

1. **Export completeness**: Every symbol exported by the original `screens.ts` is re-exported by the barrel. Use this checklist:

   | Symbol | Exists? |
   |--------|---------|
   | `SessionResult` | ✓ lib/types.ts + barrel |
   | `wordText` | ✓ ui/word-display.ts + barrel |
   | `shuffleWords` | ✓ lib/wordlists.ts + barrel |
   | `VERSION` | ✓ screens/menu.ts (optional re-export) |
   | `buildMenu` | ✓ screens/menu.ts + barrel |
   | `buildGame` | ✓ screens/game.ts + barrel |
   | `buildResults` | ✓ screens/results.ts + barrel |
   | `buildHistory` | ✓ screens/history.ts + barrel |
   | `buildEmptyHistory` | ✓ screens/history.ts + barrel |
   | `buildHistoryDetail` | ✓ screens/history.ts + barrel |

2. **Import integrity**: All consumers (`index.ts`, `screens.test.ts`) import from `"./screens"` and typecheck succeeds
3. **No engine modifications**: `git diff src/engine/` shows zero changes
4. **No test modifications**: `git diff src/screens.test.ts` shows zero changes

---

## 10. Definition of Done

The refactoring is complete when ALL of the following are true:

1. **All tests pass**: `bun run test` exit code 0
2. **Typecheck passes**: `bun run typecheck` exit code 0
3. **All 6 PRs merged**: Each PR independently satisfies its acceptance criteria
4. **Barrel is pure**: `src/screens.ts` contains only re-export statements
5. **Full export surface preserved**: All 10 public symbols from the original `screens.ts` are importable from `"./screens"`
6. **Zero behavior change**: No new features, no changed output, no new tests
7. **No dead code**: Zero commented-out code, zero orphaned functions, zero unused imports across refactored files
8. **No circular dependencies**: Module dependency graph is acyclic
9. **No engine modifications**: `src/engine/` directory is untouched
10. **No test modifications**: `src/screens.test.ts` is unchanged (import paths work via barrel)
11. **Review budget respected**: Each PR changed lines ≤ 400
12. **File count matches target**: New files exist exactly as specified: `screens/menu.ts`, `screens/game.ts`, `screens/results.ts`, `screens/history.ts`, `ui/theme.ts`, `ui/chart.ts`, `ui/word-display.ts`, `lib/wordlists.ts`, `lib/config.ts` (shell, optional for state extraction)

---

## 11. Rollback Criteria

If any PR causes test failures or runtime regressions:

1. **Per-PR rollback**: `git revert <commit-hash> && bun run test && bun run typecheck`
2. **Full rollback**: `git reset --hard HEAD~N` (N = number of applied PRs) followed by `bun run test`
3. **Trigger conditions**:
   - Any existing test fails
   - Typecheck introduces new errors
   - Screen rendering produces visibly different output
   - Barrel file fails to re-export a required symbol
   - Circular dependency is introduced
