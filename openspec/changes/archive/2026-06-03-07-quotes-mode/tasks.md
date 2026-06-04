# Tasks: Quotes Mode

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600-650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 (Foundation) → PR #2 (UI+State) |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types, data files, quote loader, DB schema + tests | PR 1 | Base: main. All tests pass independently. |
| 2 | Menu, state, game, results, history UI + tests | PR 2 | Base: main (after PR 1). Wires full game flow. |

## Phase 1: Types & Data Files

- [x] 1.1 Add `Quote` interface (`text`, `source`), extend `GameMode` with `"quote"`, add `quoteText/Source/Length` fields to `StoredSession` in `src/lib/types.ts`
- [x] 1.2 Create `src/data/quotes/english.json` — 50+ curated `{ text, source }[]` entries
- [x] 1.3 Create `src/data/quotes/spanish.json` — 50+ curated `{ text, source }[]` entries

## Phase 2: Quote Loader & DB

- [x] 2.1 Implement `getRandomQuote(lang)` + `shuffleWords(50)` fallback in `src/lib/quotes.ts`
- [x] 2.2 Update `initDB()` — add `'quote'` to CHECK, nullable `quote_text/source/length`, copy-once migration for old schema
- [x] 2.3 Update `saveSession`, `rowToSession`, `getAggregates` — handle quote metadata columns per spec scenarios

## Phase 3: State & Menu

- [x] 3.1 Replace binary toggle with `selectedModeIndex: number` + `mode: GameMode` in `state.ts` state object
- [x] 3.2 Add quote branch in `goGame()`: load random quote, elapsed `Date.now()` tracking, pre-built `Word[]`, no Timer
- [x] 3.3 Refactor `src/screens/menu.ts` — MODES array cycling, all 3 modes displayed, position indicator
- [x] 3.4 Update `handleKey` in `state.ts` — 3-way cycle (left/right), enter starts quote game
- [x] 3.5 Update `src/screens.ts` — export `getRandomQuote` from barrel

## Phase 4: Game & Results UI

- [x] 4.1 Update `buildGame()` in `game.ts` — accept `mode`, show elapsed `MM:SS` for quote, countdown unchanged for time/words
- [x] 4.2 Update `buildResults()` in `results.ts` — optional `quote?: Quote`, render source attribution below stats, truncate long text with ellipsis
- [x] 4.3 Update `formatModeOption()` in `history.ts` — handle `"quote"` mode

## Phase 5: Tests

- [x] 5.1 Write `src/lib/quotes.test.ts` — random selection per lang, empty fallback, non-empty fallback
- [x] 5.2 Add quote DB tests in `src/lib/db.test.ts` — insert quote mode, CHECK rejects invalid, nullable metadata null for time/words, query by mode
- [x] 5.3 Add menu tests in `src/screens.test.ts` — 3 modes visible, selected highlighted, position indicator
- [x] 5.4 Add game tests in `src/screens.test.ts` — elapsed `MM:SS` for quote, countdown for time, countdown for words
- [x] 5.5 Add results tests in `src/screens.test.ts` — quote text+source rendered, long text truncated, no quote section when mode is time
