# Exploration: Modo Citas (Quotes Mode)

## Current State

The codebase supports two game modes: **Time** (countdown timer ends the test) and **Words** (completing all words ends the test). The typing engine (`src/engine/typing.ts`) is word-array agnostic — it doesn't care if words come from a random shuffle or a fixed quote. The `GameMode` type in `src/lib/types.ts` already includes `"quote"` in the union, but no implementation exists.

Key observations:
- **Typing engine** works with `Word[]` arrays. `isComplete()` returns true when `currentWordIndex >= words.length`. This is already compatible with quotes — a quote is just a fixed sequence of words.
- **Timer** in words mode already runs as "stats only" — `onComplete` is ignored, and `checkGameComplete()` polls the engine. Quotes mode follows the same pattern.
- **DB schema** (`src/lib/db.ts`) has `CHECK(mode IN ('time', 'words'))` — blocks quote sessions.
- **StoredSession.mode** type is `"time" | "words"` — doesn't include `"quote"`.
- **Menu** (`src/screens/menu.ts`) uses binary left/right toggle between two modes — needs index-based cycling for three modes.
- **No quote data files** exist (`src/data/quotes/` directory missing).
- **No quotes loader** exists (`src/lib/quotes.ts` missing).

## Affected Areas

| File | Why Affected | Change Magnitude |
|------|-------------|------------------|
| `src/lib/types.ts` | `StoredSession.mode` needs `"quote"`, new `Quote` interface, `QuoteLength` type | Small |
| `src/lib/db.ts` | DB CHECK constraint, schema migration, `rowToSession` mapping, `getAggregates` | Medium |
| `src/lib/quotes.ts` | **NEW** — load and select random quotes from JSON data files | Medium |
| `src/data/quotes/english.json` | **NEW** — quote collection (50-100 quotes) | Data |
| `src/data/quotes/spanish.json` | **NEW** — quote collection (50-100 quotes) | Data |
| `src/screens/menu.ts` | Third mode option, navigation from binary toggle to 3-way cycle | Small |
| `src/lib/state.ts` | `goGame()` quote branch, quote-specific state, header display logic | Medium |
| `src/screens/game.ts` | Header shows elapsed time (not countdown) for quotes, optional source display | Small |
| `src/screens/results.ts` | Show quote source attribution in results box | Small |
| `src/screens.ts` | Barrel export for `shuffleQuotes` | Tiny |

## Approaches

### Approach 1: Minimal Engine Reuse (Recommended)

Treat a quote as a pre-built `Word[]` array. The engine needs **zero changes**. The only new logic is:
- `src/lib/quotes.ts` — parses quote text into words, selects random quote
- State management — tracks which quote was used, shows source in results
- Timer — reuse existing timer as "stats only" (same as words mode)
- Menu — add third mode with index-based cycling

| Pros | Cons | Complexity |
|------|------|------------|
| Zero engine changes | Menu navigation needs refactor (binary → 3-way) | **Low** |
| Reuses words-mode completion pattern | Need to curate quote data files | |
| Timer already supports "stats only" mode | Results screen needs quote source display | |
| Minimal risk to existing functionality | | |

### Approach 2: Engine Extension for Quote-Aware Mode

Add quote-specific fields to `GameState` (quote text, source, progress percentage). Engine tracks quote metadata alongside word typing.

| Pros | Cons | Complexity |
|------|------|------------|
| Richer GameState for quote-specific UI | Engine changes risk regression in time/words modes | **Medium** |
| Can show "quote progress" bar | Over-engineering for MVP | |
| Source available during game (not just results) | More test surface area | |

### Approach 3: Separate Quote Engine

Create `QuoteEngine` class that handles quote-specific typing logic independently from `TypingEngine`.

| Pros | Cons | Complexity |
|------|------|------------|
| Complete isolation — no regression risk | Code duplication with TypingEngine | **High** |
| Can optimize for quote-specific behavior | State management becomes more complex | |
| | Two engines to maintain | |

## Recommendation

**Approach 1: Minimal Engine Reuse.**

The typing engine is already quote-compatible. A quote is just a fixed array of words — the engine doesn't need to know the difference. The completion detection (`currentWordIndex >= words.length`) works identically. The timer already supports "stats only" mode (used by words mode).

This approach minimizes risk, keeps the change focused on data + UI layers, and follows the existing patterns established by the words mode implementation.

## Technical Details

### Quote Data Format

```json
[
  {
    "text": "The only way to do great work is to love what you do.",
    "source": "Steve Jobs",
    "length": "short"
  },
  {
    "text": "In the middle of difficulty lies opportunity.",
    "source": "Albert Einstein",
    "length": "short"
  }
]
```

Length categories: `"short"` (1-15 words), `"medium"` (16-30 words), `"long"` (31+ words).

### Quote Loader (`src/lib/quotes.ts`)

```typescript
import quotes from "../data/quotes/english.json";

export interface Quote {
  text: string;
  source: string;
  length: "short" | "medium" | "long";
}

export function getRandomQuote(): Quote {
  const idx = Math.floor(Math.random() * quotes.length);
  return quotes[idx] as Quote;
}

export function quoteToWords(quote: Quote): string[] {
  return quote.text.split(/\s+/).filter(Boolean);
}
```

### DB Schema Changes

```sql
-- Add 'quote' to CHECK constraint
CHECK(mode IN ('time', 'words', 'quote'))

-- New columns (nullable)
quote_text TEXT,
quote_source TEXT,
quote_length TEXT
```

### Menu Navigation Change

Current: `mode === "time" ? "words" : "time"` (binary toggle)
New: `modeIndex = (modeIndex + direction) % 3` with `MODES = ["time", "words", "quote"]`

### Timer Behavior for Quotes

Quotes mode uses the timer **exactly like words mode**:
- Timer starts on first keypress
- `onTick` updates live WPM display
- `onComplete` is a no-op (game ends via `checkGameComplete()`)
- `getRemainingSeconds()` is repurposed as elapsed time display

### Game Screen Header

Current: `⏱ ${remainingSeconds}s    WPM: ${liveWpm}  RAW: ${liveRawWpm}`
Quotes mode: `⏱ ${elapsedSeconds}s    WPM: ${liveWpm}  RAW: ${liveRawWpm}`

### Results Screen Addition

Add quote source line after stats:
```
Quote: "The only way to do great work..."
— Steve Jobs
```

## Risks

1. **Quote data quality** — Poor quotes (too short, too long, obscure) will hurt UX. Need curation of 50-100 quality quotes per language.
2. **Menu complexity** — Adding a third mode changes the navigation model. Need to ensure the UI remains clean and intuitive.
3. **DB migration** — Existing database won't have quote columns. Need to handle migration gracefully (ALTER TABLE or CREATE TABLE IF NOT EXISTS with new schema).
4. **Line length overflow** — Some quotes may be wider than terminal width. The existing 3-line scroll pattern handles this, but very long quotes need testing.
5. **Punctuation in quotes** — Quotes contain commas, periods, quotes marks, etc. The engine handles character-by-character matching, so punctuation is just another character to type — this is correct behavior but may surprise users used to word-only mode.

## Ready for Proposal

**Yes.** The exploration is complete. The recommended approach (Minimal Engine Reuse) is clear, low-risk, and well-understood. The orchestrator should proceed to **sdd-propose** to define scope and approach, then **sdd-spec** for detailed requirements.
