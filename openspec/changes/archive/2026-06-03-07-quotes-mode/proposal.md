# Proposal: Quotes Mode

## Intent

Add a third game mode where users type curated quotes instead of random words or timed sessions. Quotes provide contextual, meaningful text that improves user engagement and typing realism.

## Scope

### In Scope
- Quote data files (English, Spanish) with 50–100 curated quotes
- Quote loader (`src/lib/quotes.ts`) with random selection
- DB schema migration for `quote` mode and quote metadata
- Menu navigation refactor to 3-way mode cycling
- Game screen: elapsed-time header for quotes
- Results screen: quote source attribution
- State management: quote branch in `goGame()`

### Out of Scope
- Quote length filtering UI (short/medium/long selection)
- User-submitted quotes
- Multi-language quote switching beyond existing Spanish/English

## Capabilities

### New Capabilities
- `mode-quote`: Quote-mode game flow — selection, typing, completion, results with attribution

### Modified Capabilities
- `menu-navigation`: Cycle logic changes from binary toggle to 3-way index
- `session-storage`: DB schema accepts `quote` mode and stores quote metadata

## Approach

Minimal Engine Reuse. A quote is a pre-built `Word[]` array; the typing engine needs zero changes. Reuse words-mode timer behavior (stats-only / elapsed time). Changes are limited to data, UI, state, and DB layers.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/data/quotes/*.json` | New | Curated quote collections |
| `src/lib/quotes.ts` | New | Loader + random selector |
| `src/lib/types.ts` | Modified | `StoredSession.mode` adds `"quote"`; `Quote` interface |
| `src/lib/db.ts` | Modified | CHECK constraint, new nullable columns |
| `src/screens/menu.ts` | Modified | 3-way index cycling |
| `src/lib/state.ts` | Modified | Quote branch in `goGame()` |
| `src/screens/game.ts` | Modified | Elapsed-time header for quotes |
| `src/screens/results.ts` | Modified | Source attribution display |
| `src/screens.ts` | Modified | Barrel export update |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Quote data quality hurts UX | Med | Curate 50+ quality quotes, review lengths |
| DB migration breaks existing DB | Low | `ALTER TABLE` with fallback or versioned schema |
| Terminal width overflow | Low | Test long quotes; existing scroll handles overflow |

## Rollback Plan

1. Revert `src/lib/types.ts`, `src/lib/db.ts`, `src/screens/menu.ts`, `src/lib/state.ts`, `src/screens/game.ts`, `src/screens/results.ts`
2. Drop `quote` from DB CHECK constraint (or recreate table)
3. Remove `src/lib/quotes.ts` and `src/data/quotes/`
4. `git revert` the implementation commit

## Dependencies

- None external

## Success Criteria

- [ ] User can select quote mode from menu and complete a typing session
- [ ] Results show quote text and source attribution
- [ ] DB stores quote mode sessions with metadata
- [ ] All existing time/words mode behavior unchanged
- [ ] `bun run test` and `bun run typecheck` pass
