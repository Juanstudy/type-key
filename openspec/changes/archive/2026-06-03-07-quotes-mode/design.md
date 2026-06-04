# Design: Quotes Mode

## Technical Approach

Reuse the typing engine unchanged: a quote is a pre-built `string[]` fed to `TypingEngine`. All changes live in data, UI, state, and DB layers. Quote mode tracks elapsed time (count-up) instead of using the countdown `Timer`.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Quote loading | JSON import + `getRandomQuote(lang)` | Follows `wordlists.ts` pattern exactly; no new loaders |
| Elapsed time tracking | `Date.now()` diff in `state.ts`, no Timer | Engine constraint forbids timer changes; avoids over-engineering |
| Menu cycling | `MODES: GameMode[]` index, not binary toggle | Extends cleanly to N modes; single key cycles 3-way |
| DB migration | Recreate table on CHECK mismatch | SQLite cannot `ALTER TABLE DROP CONSTRAINT`; copy-once migration is safe for local DB |
| Quote → Word[] | Split on `" "`, trim punctuation | Reuses `TypingEngine` constructor directly |

## Data Flow

    quotes.json ──→ getRandomQuote(lang) ──→ string[]
         │                                    │
         └── TypingEngine(words) ←────────────┘
                        │
         keyboard events → state.ts → showGame(mode, elapsed, ...)
                        │
              isComplete() → goResults() → saveSession(quote metadata)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/data/quotes/english.json` | Create | `{ text, source }[]` curated quotes |
| `src/data/quotes/spanish.json` | Create | Same for Spanish |
| `src/lib/quotes.ts` | Create | `getRandomQuote(lang)`; falls back to `shuffleWords(50)` if missing |
| `src/lib/types.ts` | Modify | `StoredSession.mode` → `"time" \| "words" \| "quote"`; add `Quote` interface; `SessionAggregates.quote` |
| `src/lib/db.ts` | Modify | CHECK includes `"quote"`; nullable `quote_text`, `quote_source`, `quote_length`; migrate old tables; update `rowToSession`, `saveSession`, `getAggregates` |
| `src/screens/menu.ts` | Modify | 3-way mode list with highlight; position indicator (e.g., `2/3`); no options list in quote mode |
| `src/lib/state.ts` | Modify | `mode: GameMode`; `selectedModeIndex` replaces binary toggle; `goGame()` branch for quote mode; elapsed tracking without Timer |
| `src/screens/game.ts` | Modify | Accept `mode: GameMode`; show elapsed MM:SS for quote, countdown for time/words |
| `src/screens/results.ts` | Modify | Accept optional `quote` metadata; render source attribution below stats; truncate long text with ellipsis |
| `src/screens/history.ts` | Modify | `formatModeOption` handles `"quote"` |
| `src/screens.ts` | Modify | Barrel export for `getRandomQuote` |

## Interfaces / Contracts

```typescript
export interface Quote {
  text: string;
  source: string;
}

// StoredSession additions
quoteText: string | null;
quoteSource: string | null;
quoteLength: "short" | "medium" | "long" | null;

// buildGame signature
buildGame(
  mode: GameMode,
  timeValue: number,   // remaining (countdown) or elapsed (count-up)
  liveWpm: number,
  liveRawWpm: number,
  words: Word[],
  currentWordIndex: number,
): StyledText;

// buildResults signature
buildResults(
  result: SessionResult,
  wpmHistory: number[],
  quote?: Quote,
): StyledText;
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Quote loader | `src/lib/quotes.test.ts` — random selection, missing JSON fallback |
| Unit | DB migration + schema | Update `src/lib/db.test.ts` — insert quote mode, CHECK rejects invalid, nullable columns null for time/words, aggregates include `quote` stats |
| Unit | Menu render | Update `src/screens.test.ts` — 3 modes visible, selected highlighted, position indicator, no options in quote mode |
| Unit | Game header | Update `src/screens.test.ts` — elapsed format `MM:SS`, countdown unchanged |
| Unit | Results attribution | Update `src/screens.test.ts` — quote text + source rendered, long text truncated |

## Migration / Rollout

`initDB()` detects old schema (missing `quote_text` column). If found:
1. `CREATE TABLE sessions_new` with updated schema
2. `INSERT INTO sessions_new SELECT * ...` with `NULL` for new columns
3. `DROP TABLE sessions`; `ALTER TABLE sessions_new RENAME TO sessions`
4. Recreate index

No feature flags required.

## Open Questions

- None — all specs are unambiguous.
