# SDD Proposal: History Persistence

## Change ID
04-history-persistence

## Status
**Proposed** — awaiting approval before implementation

**Created**: 2026-05-22
**Author**: Gentleman Guardian Angel (SDD subagent)

---

## Intent

Type-key currently lacks persistent storage for typing session results. Each session result is ephemeral — once the user leaves the results screen, the data is lost. This prevents tracking personal progress, seeing personal bests, and reviewing past sessions.

This change implements persistent history storage using Bun's built-in `bun:sqlite` database, enabling users to:
- View a history of all completed sessions
- See aggregate statistics (best WPM, average performance)
- Review past sessions with detailed results and WPM charts
- Track progress over time

The implementation follows project standards: TDD with strict RED→GREEN→REFACTOR, OpenSpec for artifacts, and Engram for discoveries/decisions.

---

## Scope

### In Scope

#### 1. Database Layer
- **Module**: `src/lib/db.ts`
- **Database**: `bun:sqlite` singleton at `~/.local/share/type-key/type-key.db`
- **Schema**: Single table `sessions` with columns:
  ```sql
  CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    mode TEXT NOT NULL,
    time_option INTEGER,
    word_count INTEGER,
    wpm REAL NOT NULL,
    raw_wpm REAL NOT NULL,
    accuracy REAL NOT NULL,
    correct_chars INTEGER NOT NULL,
    total_chars INTEGER NOT NULL,
    errors INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    wpm_history TEXT
  );

  CREATE INDEX idx_sessions_timestamp ON sessions(timestamp DESC);
  CREATE INDEX idx_sessions_mode ON sessions(mode);
  ```

- **Public API**:
  - `initDB()`: Creates schema if not exists
  - `saveSession(result, wpmHistory, mode, timeOption?, wordCount?)`: Inserts a new session
  - `getSessions(limit, offset, mode?)`: Paginated list of sessions
  - `getSession(id)`: Single session by ID
  - `getAggregates(mode?)`: Returns `{ bestWpm, bestWpmMode, avgWpm, avgAccuracy, totalSessions }`

#### 2. History Screen
- **Module**: `src/screens.ts`
- **Function**: `buildHistory(sessions: StoredSession[], selectedId?: number)`
- **Features**:
  - Stats header at top showing:
    - Best WPM (overall + by mode)
    - Average WPM (last 10 sessions)
    - Average accuracy (last 10 sessions)
    - Total sessions count
  - Paginated list of recent sessions (10 per page, newest first)
  - Each row displays: WPM, mode+option, date
  - Arrow up/down navigation to select session
  - Enter key to view full session details (reuses `buildResults()` with stored data)
  - Esc key returns to menu

#### 3. Auto-save on Results
- **Location**: `src/index.ts` in `goResults()`
- **Behavior**: After computing session stats, automatically call `db.saveSession()` with:
  - Session result (wpm, rawWpm, accuracy, correctChars, totalChars, errors)
  - `wpmHistory` array from state
  - Current mode
  - Current timeOption or wordCount

#### 4. Menu Integration
- **Type Update**: Add `"history"` to `ScreenName` in `src/lib/types.ts`
- **Menu Display**: Add "History" option in `buildMenu()` (separate mode or standalone entry)
- **Navigation**: Handle arrow keys in history screen for list navigation
- **Startup**: Call `db.init()` in `main()` before rendering menu

#### 5. Tests
- **Unit**: `src/lib/db.test.ts` — DB operations, JSON serialization, aggregate queries
- **UI**: `src/screens.test.ts` — `buildHistory()` rendering, empty state, stats display
- **Integration**: Test complete flow: complete game → results → session saved → history screen

### Out of Scope (MVP)

- Session deletion/cleanup
- Export/import functionality
- Charts/trends over time beyond aggregate stats
- Language or difficulty columns
- Settings screen for history preferences
- Manual session entry
- User accounts/login

---

## Affected Areas

| Area | Files Modified | New Files | Dependencies |
|------|----------------|-----------|--------------|
| Types | `src/lib/types.ts` | — | — |
| Database | — | `src/lib/db.ts` | `bun:sqlite` (built-in) |
| Screens | `src/screens.ts` | — | `asciichart` (already used) |
| Main | `src/index.ts` | — | — |
| Tests | `src/lib/db.test.ts` | — | `bun:test` |
| Tests | `src/screens.test.ts` | — | `bun:test` |
| Artifacts | — | `openspec/changes/04-history-persistence/` | — |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **DB file permissions** on first run may fail | User can't save sessions | Medium | Wrap `initDB()` in try/catch, create directory if needed |
| **SQL injection** via mode/option strings | Data integrity issue | Low | Use parameterized queries (bun:sqlite supports it) |
| **Large wpm_history arrays** (120+ points) cause storage bloat | Disk usage grows quickly | Low | Store full array, downsample on display only |
| **Schema migration** needed for future columns | Breaking changes | Low | Use `IF NOT EXISTS` for table creation, plan for v2 columns |
| **DB locked** during concurrent access (unlikely in CLI app) | Save failures | Very Low | Bun:sqlite handles this; add error handling |
| **Performance** on large datasets (1000+ sessions) | Slow queries | Low | Indexes on timestamp/desc and mode; limit queries to 10-100 rows |

---

## Rollback Plan

If implementation fails or introduces critical bugs:

1. **Database**: No migration needed — just delete `~/.local/share/type-key/type-key.db` to reset
2. **Code**: Revert commits using `git revert` to restore `src/lib/db.ts`, `src/screens.ts`, `src/index.ts`
3. **Tests**: Remove new test files (`src/lib/db.test.ts`) and tests from `src/screens.test.ts`
4. **Menu**: Remove "History" option from `buildMenu()`; remove `"history"` from `ScreenName`
5. **Auto-save**: Remove `db.saveSession()` call from `goResults()`

Total rollback impact: ~300 lines of code, no data migration required.

---

## Success Criteria

### Functional Requirements
- ✅ Completing a game session saves the result to the database
- ✅ Opening the History screen displays all saved sessions (paginated, newest first)
- ✅ Stats header shows accurate best WPM (overall + by mode), average WPM (last 10), average accuracy, total count
- ✅ Navigating the history list with arrow keys selects the correct session
- ✅ Pressing Enter on a session shows the full results screen with that session's data and WPM chart
- ✅ Pressing Esc in history screen returns to the main menu

### Non-Functional Requirements
- ✅ All new code has corresponding tests (TDD)
- ✅ `bun run test` passes with 100% pass rate (target: 80+ tests)
- ✅ `bun run typecheck` passes with no errors
- ✅ Database operations handle errors gracefully (DB locked, permissions, etc.)
- ✅ No new npm dependencies added (bun:sqlite is built-in)
- ✅ UI matches existing design patterns (colored text, borders, layout)

### Performance
- ✅ Opening history screen loads in < 100ms for 1000 sessions
- ✅ Saving a session takes < 10ms
- ✅ Aggregate queries (best WPM, avg WPM) execute in < 50ms

---

## Design Decisions

### 1. Database Location: XDG Data Directory
**Decision**: Store DB at `~/.local/share/type-key/type-key.db`

**Rationale**:
- Follows XDG Base Directory Specification for user data
- Separates type-key data from application code
- No writable permission issues in common user directories
- Easy to backup/backup/clear data manually

**Alternatives Considered**:
- `./data/history.db` (too close to code, easy to accidentally commit)
- `~/.type-key/history.db` (not following XDG spec)
- SQLite in-memory only (no persistence)

### 2. Store Full wpm_history vs Sampled
**Decision**: Store the full array (120+ points) as JSON in the database

**Rationale**:
- Allows reconstructing the exact WPM trajectory
- Downsampling happens only on display (in `buildWpmChart()`)
- Storage cost is minimal (~100 bytes per session)
- Future-proof for advanced analytics or trend visualization

**Alternatives Considered**:
- Downsample to 30 points in DB (lose resolution)
- Store only final WPM (lose chart data)

### 3. Single Session Table vs Separate Tables
**Decision**: Single `sessions` table with nullable columns for mode-specific options

**Rationale**:
- Simpler schema, easier to understand
- Mode-specific fields (timeOption vs wordCount) don't coexist, so NULLs are fine
- Easier to query with `WHERE mode = ?`

**Alternatives Considered**:
- Separate tables (`time_sessions`, `words_sessions`)
- Union queries for cross-mode statistics
- JSON object for all metadata (over-engineered for MVP)

### 4. History Screen vs Stats Screen Only
**Decision**: Full history screen with list + stats header + view details

**Rationale**:
- Provides both aggregate stats AND individual session review
- Users can see their best sessions and review them
- Matches existing pattern (menu → game → results → [menu])

**Alternatives Considered**:
- Stats-only screen (too limited, doesn't show individual sessions)
- Combined stats + list (cluttered UI)
- Separate screens (more navigation, but more discoverable)

---

## Implementation Estimate

| Phase | Effort | Lines | Tests |
|-------|--------|-------|-------|
| Database layer | 2-3 hours | ~150 | ~5 |
| History screen | 2 hours | ~100 | ~3 |
| Integration (index.ts) | 1 hour | ~50 | ~2 |
| Tests (UI + DB) | 2 hours | ~50 | — |
| Review & Refactor | 1 hour | — | — |
| **Total** | **8-9 hours** | **~350** | **~10** |

---

## Questions for Supervisor

1. **Review Budget**: Estimated 350 changed lines is below the 400-line budget. Proceed with single PR?

2. **Artifacts**: This proposal is in OpenSpec (`openspec/changes/04-history-persistence/proposal.md`). Proceed to spec phase?

3. **Dependency Check**: Is `bun:sqlite` available in the current Bun version, or do we need to add it to `package.json`?

4. **Screen Integration**: Should "History" be a separate mode in the menu (like "Time" vs "Words"), or a standalone entry accessible via the same arrow keys as options? (Recommend: standalone entry for clarity)

---

## References

- [Bun SQLite Documentation](https://bun.sh/docs/api/sqlite)
- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)
- Previous SDD work: `openspec/changes/03-words-mode/`
- Project standards: `docs/AGENTS.md`