# SDD Spec: 04-history-persistence

## Requirements

### R1 — Database Module

A `src/lib/db.ts` module using `bun:sqlite` that:

1. Creates/opens SQLite database at `~/.local/share/type-key/type-key.db`
2. Creates `sessions` table with `CREATE TABLE IF NOT EXISTS`
3. Exports a singleton `getDB()` function
4. Exports `initDB()` — called once at startup
5. Exports `saveSession(data: NewSession)` — inserts a row
6. Exports `getSessions(limit, offset)` — returns paginated results, newest first
7. Exports `getSession(id)` — returns single session by id
8. Exports `getAggregates()` — returns best WPM, avg WPM (last 10), avg accuracy (last 10), total count
9. All queries use parameterized statements (no string interpolation)

#### Schema

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('time', 'words')),
  time_option INTEGER,
  word_count INTEGER,
  wpm REAL NOT NULL,
  raw_wpm REAL NOT NULL,
  accuracy REAL NOT NULL,
  correct_chars INTEGER NOT NULL,
  total_chars INTEGER NOT NULL,
  errors INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  wpm_history TEXT DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_sessions_ts ON sessions(timestamp DESC);
```

#### Types (in src/lib/types.ts)

```typescript
export interface StoredSession {
  id: number;
  timestamp: string;
  mode: "time" | "words";
  timeOption: number | null;
  wordCount: number | null;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  totalChars: number;
  errors: number;
  durationSeconds: number;
  wpmHistory: number[];
}

export type NewSession = Omit<StoredSession, "id">;

export interface SessionAggregates {
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  totalSessions: number;
}
```

### R2 — Auto-save on Results

In `src/index.ts`:

1. Import DB module
2. Call `initDB()` in main() before goMenu()
3. In `goResults()`, after computing stats, call `saveSession()` with current game data
4. Save: mode, selected time/word option, all stats, wpmHistory, durationSeconds

### R3 — History Screen

A new screen showing past sessions:

1. **Stats header**: Best WPM, Avg WPM (last 10), Avg Accuracy (last 10), Total Sessions
2. **Session list**: Paginated, 10 per page, newest first
3. Each row: `#<id>  <wpm> WPM  <mode+option>  <date>`
4. Arrow up/down navigates rows
5. Shows page indicator (e.g., "Page 1/3")
6. **Empty state**: "No sessions yet. Complete a game to see your history here."

### R4 — Session Detail Screen

When pressing Enter on a history row:

1. Shows full results (same format as results screen) + WPM chart
2. Shows session metadata: date, mode, duration
3. Esc goes back to history list, Tab goes to re-run that mode

### R5 — Menu Integration

1. Add "History" as a screen reachable from menu
2. From menu, pressing a key (e.g., "h") or adding as a navigation option
3. Esc from history returns to menu

### R6 — ScreenName Type Update

```
ScreenName = "menu" | "game" | "results" | "history" | "history-detail"
```

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC1 | Sessions persist after app restart | Run game, quit, restart, see session in history |
| AC2 | Aggregate stats are correct | Play 2+ games, verify best/avg match |
| AC3 | Session list is paginated (10/page) | Save 12 sessions, verify page 2 exists |
| AC4 | Empty history shows friendly message | Fresh DB, navigate to history |
| AC5 | Detail view shows full results + chart | Navigate to a session, press Enter |
| AC6 | All DB queries are parameterized | Code review — no string interpolation in SQL |
| AC7 | DB init is idempotent | Call initDB() twice, no errors |
| AC8 | 80+ tests pass | `bun run test` |
| AC9 | typecheck clean | `bun run typecheck` |
