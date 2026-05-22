# SDD Design: 04-history-persistence

## Architecture

### Module Dependency

```
index.ts ──→ lib/db.ts ──→ bun:sqlite
index.ts ──→ screens.ts (buildHistory, buildHistoryDetail)
           ─→ lib/types.ts (StoredSession, ScreenName)
```

### Data Flow

```
Game complete → goResults()
  → compute stats (existing)
  → saveSession({ mode, timeOption, wordCount, stats, wpmHistory, durationSeconds })
  → render results screen (no change)

Menu → navigate to "History"
  → loadSessions(limit=10, offset) + getAggregates()
  → render buildHistory(sessions, aggregates, page)
  → arrow keys paginate/navigate, Enter → detail

History Detail
  → getSession(id)
  → render buildResults(storedSession) + buildWpmChart(storedSession.wpmHistory)
  → Esc → back to history list
```

## Database Design

### File Location

Platform-specific XDG data directory:

```typescript
function getDbPath(): string {
  const dataDir = process.env.XDG_DATA_HOME
    ?? path.join(os.homedir(), ".local", "share");
  const appDir = path.join(dataDir, "type-key");
  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
  return path.join(appDir, "type-key.db");
}
```

### Singleton Pattern

```typescript
let db: Database | null = null;

export function getDB(): Database {
  if (!db) db = new Database(getDbPath());
  return db;
}
```

### Writes

- `saveSession()`: INSERT with all columns, returns lastInsertRowid
- No UPDATE/DELETE in MVP

### Reads

- `getSessions(limit, offset)`: SELECT ordered by timestamp DESC with LIMIT/OFFSET
- `getSession(id)`: SELECT WHERE id = ?
- `getAggregates()`: 
  - `SELECT MAX(wpm) as bestWpm FROM sessions`
  - `SELECT AVG(wpm) as avgWpm, AVG(accuracy) as avgAccuracy FROM (SELECT * FROM sessions ORDER BY timestamp DESC LIMIT 10)`
  - `SELECT COUNT(*) as totalSessions FROM sessions`
  - All in a single query using subqueries, or 3 separate queries for clarity

### wpmHistory Serialization

- Store as JSON string (JSON.stringify on save, JSON.parse on read)
- Type conversion helpers: `serializeHistory(arr: number[]): string` / `parseHistory(str: string): number[]`

## UI Design

### History Screen Layout

```
┌──────────────────────────────────────────┐
│              — History —                  │
│                                           │
│  Best: 82 WPM    Avg: 45 WPM   85.3%      │
│  Total: 24 sessions                       │
│                                           │
│  ┌──────────────────────────────────────┐ │
│  │ #12  82 WPM  time 30s  2026-05-22  ▸ │ │
│  │ #11  78 WPM  time 15s  2026-05-22    │ │
│  │ #10  45 WPM  words 50  2026-05-21    │ │
│  │ ...                                   │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  Page 1/3    ↑↓ Navigate  Enter View      │
│  Esc: Menu                                 │
└──────────────────────────────────────────┘
```

### History Detail Layout

Reuse `buildResults()` format + show session metadata above:

```
┌──────────────────────────────────────┐
│         — Session #12 —              │
│  2026-05-22 · time 30s               │
│                                      │
│  WPM:        82                      │
│  Raw WPM:    88                      │
│  Accuracy:   93.2%                   │
│  Chars:      210 / 230               │
│  Errors:     20                      │
│                                      │
│  WPM over time:                      │
│  ...chart...                         │
│                                      │
│  Tab: Re-run  Esc: History           │
└──────────────────────────────────────┘
```

### Empty State

```
┌──────────────────────────────────────┐
│            — History —                │
│                                       │
│   No sessions yet.                    │
│   Complete a game to see your         │
│   history here.                       │
│                                       │
│   Esc: Menu                           │
└──────────────────────────────────────┘
```

## Integration Points

### index.ts Changes

1. **Imports**: `import { initDB, saveSession, getSessions, getSession, getAggregates } from "./lib/db"`
2. **State**: Add `historyPage: number`, `historySelectedIndex: number`, `historySessions: StoredSession[]`, `historyAggregates: SessionAggregates`, `historySessionDetail: StoredSession | null`
3. **main()**: Call `initDB()` before `goMenu()`
4. **goResults()**: After computing `state.result`, call `saveSession({...})`
5. **Menu**: Add a "History" mode option or navigation key
6. **handleKey()**: Cases for "history" and "history-detail" screens
7. **goHistory()**: Load sessions + aggregates, render
8. **goHistoryDetail(id)**: Load single session, render

### screens.ts Changes

1. `buildHistory(sessions, aggregates, page, totalPages)`: StyledText
2. `buildHistoryDetail(session)`: StyledText (reuses buildResults + metadata header)
3. `buildEmptyHistory()`: StyledText

### lib/types.ts Changes

1. Add `StoredSession` interface
2. Add `SessionAggregates` interface  
3. Extend `ScreenName` union: `"history" | "history-detail"`

## Test Plan

### src/lib/db.test.ts

| Test | Description |
|------|-------------|
| initDB creates table | Call initDB(), verify sessions table exists |
| save and retrieve session | Save a session, load by id, verify fields match |
| getSessions pagination | Save 15 sessions, verify page 1 has 10, page 2 has 5 |
| getSessions orders by desc | Save 2 sessions, verify newest comes first |
| getAggregates best WPM | Save sessions with varying WPM, verify MAX is returned |
| getAggregates avg last 10 | Save 15 sessions, verify avg uses only last 10 |
| getAggregates total count | Save 5 sessions, verify count = 5 |
| wpmHistory JSON roundtrip | Save array [1,2,3], verify loaded array matches |
| empty DB state | getSessions returns [], getAggregates returns zeros |
| multiple saves | Save 3 sessions, verify all retrievable |

### src/screens.test.ts

| Test | Description |
|------|-------------|
| buildHistory renders stats | Verify header shows best, avg, accuracy |
| buildHistory renders session rows | Verify rows contain WPM, mode, date |
| buildHistory empty state | Empty sessions array shows friendly message |
| buildHistory pagination indicator | Page 1/3 shown correctly |
| buildHistoryDetail renders | Verify metadata + stats + chart are shown |

## Performance

- DB operations are sync but fast (<1ms for small datasets)
- Aggregates are simple SELECT queries on indexed columns
- Worst case: 1000 sessions, query time <10ms
- wpm_history JSON parsing: ~0.1ms per session

## Trade-offs

| Decision | Alternative | Why chosen |
|----------|-------------|------------|
| Sync SQLite | Async | bun:sqlite is sync, fast enough for CLI |
| JSON column for history | Separate table | Simpler queries, history is read-only |
| Singleton DB | Dependency injection | Simpler for MVP, no DI framework |
| XDG data dir | Project dir | Persists across installs/updates |
| 3 separate aggregate queries | Single query | Readability, negligible perf difference |
