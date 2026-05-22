# SDD Tasks: 04-history-persistence

## Review Workload Forecast

- Estimated changed lines: **~350** (db.ts: 120, screens.ts: 150, index.ts: 50, types.ts: 15, db.test.ts: 100, screens.test.ts: 80)
- Risk: Medium (new module, new screen, DB integration)
- Recommendation: Single PR (<400 lines threshold)

## Tasks

### T1 — Database module

**Files:** `src/lib/db.ts` (new), `src/lib/types.ts` (edit)

**Changes:**
1. Add `StoredSession`, `NewSession`, `SessionAggregates` interfaces to `src/lib/types.ts`
2. Extend `ScreenName` union: add `"history"` and `"history-detail"`
3. Create `src/lib/db.ts` with:
   - `getDbPath()` — resolve XDG data dir
   - `getDB()` / `initDB()` — singleton + schema
   - `saveSession(data)` — INSERT with params
   - `getSessions(limit, offset)` — paginated DESC
   - `getSession(id)` — single row
   - `getAggregates()` — best/avg/count
   - `serializeHistory()` / `parseHistory()` helpers

**Tests:** `src/lib/db.test.ts` (new) — 10 tests

**Dependencies:** None

---

### T2 — History screen

**Files:** `src/screens.ts` (edit), `src/screens.test.ts` (edit)

**Changes:**
1. `buildHistory(sessions, aggregates, page, totalPages)` — stats header + session list
2. `buildHistoryDetail(session)` — metadata header + full results + chart
3. `buildEmptyHistory()` — friendly empty state
4. Tests: history rendering (stats, rows, pagination), detail rendering, empty state

**Dependencies:** T1 (types)

---

### T3 — Integration

**Files:** `src/index.ts` (edit)

**Changes:**
1. Import DB functions
2. Call `initDB()` in main()
3. Add `goHistory()`, `goHistoryDetail()` screen functions
4. Add history-related state fields
5. Call `saveSession()` in `goResults()`
6. Add menu navigation to history
7. `handleKey()` cases for history + history-detail screens

**Dependencies:** T1, T2

---

### T4 — Verify

**Files:** All changed files

**Actions:**
1. Run full test suite: `bun run test`
2. Run typecheck: `bun run typecheck`
3. Manual smoke test: play a game, check history, check persistence after restart

**Dependencies:** T3
