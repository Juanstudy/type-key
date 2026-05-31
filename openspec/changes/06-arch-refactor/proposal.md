# SDD Proposal: 06-arch-refactor — Structural Refactoring of type-key (Monkeyterm)

## Problem Statement

The current codebase has two monolithic files concentrating 64% of all source code:

- **`src/screens.ts`** (~620 lines) — bundles all screen builders (`buildMenu`, `buildGame`, `buildResults`, `buildHistory`, `buildHistoryDetail`, `buildEmptyHistory`), UI primitives (`wordText`, `colored`), chart helpers (`buildWpmChart`, `renderChartLines`, `downsample`, `padCenter`), theme color constants (`CORRECT_FG`, `INCORRECT_FG`, etc.), wordlist logic (`shuffleWords`), and a `SessionResult` interface in one file. This creates tight coupling between UI rendering, data logic, and charting.
- **`src/index.ts`** (~514 lines) — mixes global mutable state, event loop, keyboard handling, screen routing, DB integration, timer management, WPM calculation, and CLI entry point. This makes the entry point impossible to test in isolation and hard to reason about.

### Symptoms

1. **Hard to navigate**: Finding a specific screen builder requires scrolling through 620 lines of unrelated code.
2. **Hard to test in isolation**: Screen builders cannot be unit-tested without importing the entire monolith. Since screen tests already exist, any refactoring must preserve the exact same public API.
3. **Hard to extend**: Adding a new screen (e.g., quotes mode) requires touching the monolithic file and threading new state through `index.ts`.
4. **Hard to reason about**: `index.ts` couples IO (renderer, key input) with domain logic (game state transitions, WPM calculation).
5. **`SessionResult` interface lives in `screens.ts`** — a UI file — violating separation of concerns. It should live alongside other shared types in `lib/types.ts`.
6. **`shuffleWords()` lives in `screens.ts`** — data logic (Fisher-Yates shuffle + wordlist slicing) is co-located with UI rendering code.

## Intended Outcome

A clean, navigable project structure matching `docs/PRD.md` target architecture:

```
src/
├── screens/              # One file per screen builder
│   ├── menu.ts           # buildMenu()
│   ├── game.ts           # buildGame()
│   ├── results.ts        # buildResults()
│   └── history.ts        # buildHistory(), buildEmptyHistory(), buildHistoryDetail()
├── engine/               # Unchanged — typing.ts, timer.ts, wpm.ts
├── lib/
│   ├── types.ts          # Extended: +SessionResult interface
│   ├── db.ts             # Unchanged
│   ├── config.ts         # NEW — persistent config (future)
│   └── wordlists.ts      # NEW — shuffleWords() extracted
├── ui/
│   ├── theme.ts          # NEW — color palette constants
│   ├── chart.ts          # NEW — buildWpmChart(), renderChartLines(), downsample(), padCenter()
│   └── word-display.ts   # NEW — wordText(), colored() helper
├── data/wordlists/       # Unchanged
├── screens.ts            # Barrel file: re-exports all screen builders
├── screens.test.ts       # Unchanged — imports from ./screens work via barrel
└── index.ts              # Kept but with clearer boundaries (state extraction optional)
```

### Non-goals

- No new features
- No behavior changes
- No test changes (tests must pass identically)
- No removal of `screens.ts` — it stays as a barrel file for backward compatibility
- No engine module restructuring (typing.ts, timer.ts, wpm.ts stay as-is)
- No DB module changes
- No CLI flag feature work

## Scope

### In Scope

| Item | Description |
|------|-------------|
| Extract `ui/theme.ts` | Move color constants from `screens.ts` to a dedicated theme module |
| Extract `ui/chart.ts` | Move `buildWpmChart()`, `renderChartLines()`, `downsample()`, `padCenter()` |
| Extract `ui/word-display.ts` | Move `wordText()`, `colored()` helper |
| Extract `lib/wordlists.ts` | Move `shuffleWords()`, import wordlist from `data/` |
| Move `SessionResult` to `lib/types.ts` | Interface moves from `screens.ts` to shared types; re-exported from screens barrel |
| Create `screens/menu.ts` | `buildMenu()` with all its dependencies resolved via imports from `ui/` and `lib/` |
| Create `screens/game.ts` | `buildGame()` with imports from `ui/` |
| Create `screens/results.ts` | `buildResults()` with imports from `ui/chart.ts` and `ui/theme.ts` |
| Create `screens/history.ts` | `buildHistory()`, `buildEmptyHistory()`, `buildHistoryDetail()`, `formatModeOption()`, `formatDate()` |
| Convert `screens.ts` to barrel | Re-export all public symbols from `screens/` and `lib/types.ts` |
| Update `index.ts` imports | Point to new module locations |
| State extraction from `index.ts` | Optional — extract global state object and screen transition functions to a dedicated module if review budget allows |

### Out of Scope

- `lib/config.ts` — declared as NEW in target architecture but deferred (no config persistence feature yet)
- Engine refactoring (`engine/typing.ts`, `engine/timer.ts`, `engine/wpm.ts`)
- Database refactoring (`lib/db.ts`)
- Any new features (quotes mode, CLI flags, theming system)
- Test file changes (except imports if barrel behavior changes)
- `@crafter/charts` swap or chart library changes
- Wordlist data changes

## Affected Areas

| Area | Impact | Risk Level |
|------|--------|------------|
| `src/screens.ts` | Deleted content, becomes barrel re-export | **Low** — barrel preserves all imports |
| `src/index.ts` | Import paths change; state extraction optional | **Low-Med** — controlled via import aliases |
| `src/screens.test.ts` | Zero changes expected; imports from `./screens` still work | **None** — barrel maintains API |
| `src/ui/theme.ts` (NEW) | 5 color constants extracted | **Low** — pure constants |
| `src/ui/chart.ts` (NEW) | ~80 lines extracted | **Low** — pure functions |
| `src/ui/word-display.ts` (NEW) | ~40 lines extracted | **Low** — pure functions |
| `src/lib/wordlists.ts` (NEW) | ~15 lines extracted | **Low** — pure function |
| `src/lib/types.ts` | +SessionResult interface (~6 lines) | **Low** — type-only addition |
| `src/screens/menu.ts` (NEW) | ~50 lines from screens.ts | **Low** — pure builder |
| `src/screens/game.ts` (NEW) | ~30 lines from screens.ts | **Low** — pure builder |
| `src/screens/results.ts` (NEW) | ~100 lines from screens.ts | **Low** — pure builder |
| `src/screens/history.ts` (NEW) | ~250 lines from screens.ts | **Low-Med** — largest file, multiple builders |
| Build pipeline | No changes | **None** |
| Test pipeline | No changes | **None** — `bun test` continues to work |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Barrel breaks test imports** | Very Low | High | Keep `screens.ts` as barrel re-exporting from `screens/` + `lib/types.ts`. Run tests after each PR. |
| **Circular dependency** | Low | Medium | Extract `ui/` first (no deps on screens/), then `lib/wordlists.ts` (no deps on screens/), then screens/. Charts depend on theme constants only. Screens depend on ui/ and lib/ only. |
| **Missed public symbol in barrel** | Low | Medium | Grep all exports from original `screens.ts` and verify each is re-exported. Check `index.ts` imports compile. |
| **Review budget exceeded (400 lines/PR)** | Medium | Low | PR 4 (history, ~230 lines) and PR 5 (config+state, ~350 lines) are the chunkiest. Split further if needed. |
| **State extraction introduces bug** | Medium | High | Keep state in `index.ts` if review budget is tight; defer extraction to follow-up. No behavior change = no new state logic. |
| **Accidental behavior change** | Low | High | All 115 tests must pass identically. Manual quick-run of all 3 modes (time, words, results flow). |

## Success Criteria

### Functional (must all pass)

1. **All 115 existing tests pass**: `bun run test` exit code 0
2. **Typecheck passes**: `bun run typecheck` exit code 0
3. **All 4 screens render identically**: Menu, Game, Results, History screens produce equivalent `StyledText` output for the same inputs
4. **`SessionResult` is imported from `lib/types.ts`** (and re-exported from `screens.ts`)
5. **`shuffleWords()` is importable from `lib/wordlists.ts`** (and re-exported from `screens.ts`)
6. **`buildMenu()`, `buildGame()`, `buildResults()`, `buildHistory()`, `buildEmptyHistory()`, `buildHistoryDetail()` are all importable from `./screens`** (barrel)

### Non-functional

1. **Zero lines of dead code** in the refactored files (no commented-out imports, no orphaned functions)
2. **No `import * from` namespace imports** — use named imports (per AGENTS.md rules)
3. **No circular dependencies** between new modules
4. **Co-located files**: screens live in `screens/`, UI primitives in `ui/`, data logic in `lib/`
5. **Review budget per PR ≤ 400 changed lines** (target under the threshold)

## Implementation Plan: 6 Chained PRs

### PR 1: `06a-ui-primitives` — Extract UI primitives and wordlist (≈150 Δ lines)

**Files created:**
- `src/ui/theme.ts` — color constants (`CORRECT_FG`, `INCORRECT_FG`, `EXTRA_FG`, `SELECTED_FG`, `HEADER_FG`)
- `src/ui/chart.ts` — `buildWpmChart()`, `renderChartLines()`, `downsample()`, `padCenter()` (depends on theme.ts)
- `src/ui/word-display.ts` — `colored()`, `wordText()` (depends on theme.ts)
- `src/lib/wordlists.ts` — `shuffleWords()` + wordlist import

**Files modified:**
- `src/screens.ts` — remove extracted code, add imports from new modules

**Rationale:** No circular dependency risk. UI modules depend only on `@opentui/core` types and theme constants. Wordlist module depends only on `data/wordlists/english.json`. After this PR, `screens.ts` still contains all screen builders but imports their dependencies from `ui/` and `lib/`.

**Risk:** Low

### PR 2: `06b-menu-game` — Extract menu and game screens (≈85 Δ lines)

**Files created:**
- `src/screens/menu.ts` — `buildMenu()`, `VERSION`, `MODE_LABELS` (depends on `ui/theme.ts`)
- `src/screens/game.ts` — `buildGame()` (depends on `ui/word-display.ts`, `ui/theme.ts`)

**Files modified:**
- `src/screens.ts` — add re-exports from `screens/menu.ts` and `screens/game.ts`

**Rationale:** Menu and game are the smallest screens (≈50 and ≈30 lines). Extracting them first proves the barrel pattern works before tackling larger files.

**Risk:** Low

### PR 3: `06c-results` — Extract results screen (≈95 Δ lines)

**Files created:**
- `src/screens/results.ts` — `buildResults()` (depends on `ui/chart.ts`, `ui/theme.ts`, `lib/types.ts`)

**Files modified:**
- `src/screens.ts` — add re-export from `screens/results.ts`

**Rationale:** Results screen includes chart integration. Extracting it separately allows focused testing of the box-drawing layout logic.

**Risk:** Low

### PR 4: `06d-history` — Extract history screens (≈230 Δ lines)

**Files created:**
- `src/screens/history.ts` — `buildHistory()`, `buildEmptyHistory()`, `buildHistoryDetail()`, `formatModeOption()`, `formatDate()` (depends on `ui/chart.ts`, `ui/theme.ts`, `lib/types.ts`)

**Files modified:**
- `src/screens.ts` — add re-exports from `screens/history.ts`

**Rationale:** History is the largest screen file (≈250 lines) with 3 builders plus helper functions. Extracting it last means its dependencies (ui/\*, lib/types, chart) are already available.

**Risk:** Low-Med (largest individual move, highest chance of missing an export)

### PR 5: `06e-config-state` — Config module + state extraction + keyboard refactor (≈350 Δ lines)

**Files created:**
- `src/lib/config.ts` — XDG path resolution, `Bun.file` read/write for `config.json` (shell — ready for future feature)
- `src/lib/state.ts` — extract global mutable state object, screen transition functions (`goMenu`, `goGame`, `goResults`, `goHistory`, `goHistoryDetail`), `updateLiveWpm()`, keyboard handler

**Files modified:**
- `src/index.ts` — slim down to: import state module, init renderer, attach keyboard listener, call `main()`
- `src/screens.ts` — re-export `SessionResult` from `lib/types.ts`

**Critical step:** Move `SessionResult` interface from `screens.ts` to `lib/types.ts`. Add re-export in `screens.ts` so existing imports in `screens.test.ts` and `index.ts` continue to work.

**Rationale:** This is the most invasive PR. State extraction touches every screen transition path. If review budget is tight, defer state extraction to a follow-up and only do `lib/config.ts` shell + `SessionResult` move.

**Risk:** Medium (state extraction has highest bug potential)

### PR 6: `06f-cleanup` — Barrel conversion + import cleanup (≈100 Δ lines)

**Files modified:**
- `src/screens.ts` — strip all function definitions, keep only barrel re-exports from `screens/*` and `lib/types.ts`

```typescript
// Final barrel file:
export { buildMenu } from "./screens/menu";
export { buildGame } from "./screens/game";
export { buildResults } from "./screens/results";
export { buildHistory, buildEmptyHistory, buildHistoryDetail } from "./screens/history";
export { shuffleWords } from "./lib/wordlists";
export { SessionResult } from "./lib/types";
```

**Files deleted:** None (all extracted files already exist)

**Rationale:** Final step. By this point, all functions have been extracted and all re-exports are in place. This PR simply removes the original function bodies from `screens.ts`, leaving only the barrel.

**Risk:** Low

## Rollback Plan

Per Git workflow (Opción A in `docs/AGENTS.md`), all work happens on `dev` branch. Rollback is straightforward:

### For any single PR:
```bash
git revert <commit-hash>
bun run test    # verify tests pass
bun run typecheck
```

### For the full change (if rolled back as a whole):
```bash
git checkout dev
git reset --hard HEAD~6    # rewind past all 6 PR commits
bun run test               # verify original state
bun run typecheck
```

### Key checkpoints for rollback decision:
1. If `screens.ts` barrel breaks CI in **PR 1**: rollback PR 1, verify barrel approach
2. If any screen extraction breaks rendering in **PR 2-4**: rollback that PR, verify extraction boundaries
3. If state extraction in **PR 5** introduces a runtime bug: rollback PR 5, defer state extraction
4. If barrel conversion in **PR 6** breaks imports: restore `screens.ts` from previous commit, re-verify export list

### Data safety:
- No database schema changes — `results.db` is untouched
- No config file changes — `config.json` is untouched (config module is just a shell)
- No wordlist changes — `english.json` is untouched

---

*Prepared from exploration output, docs/PRD.md, docs/AGENTS.md, and current source analysis.*
*Skill resolution: injected*
*Date: 2026-05-29*
