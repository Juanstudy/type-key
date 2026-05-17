# Apply Progress: Mode Time - Phase 1

**Started**: 2026-05-17
**Completed**: 2026-05-17
**Phase**: 1 (Test-First Development)

---

## Task 1.1: Setup Test Infrastructure

**Status**: ✅ Complete

### Steps

- [x] Create `src/engine/typing.test.ts` (placeholder)
- [x] Create `src/engine/timer.test.ts` (placeholder)
- [x] Create `src/engine/wpm.test.ts` (placeholder)
- [x] Verify `bun run test` runs without errors

### Results

```
bun test v1.3.11
0 pass, 0 fail
Ran 0 tests across 3 files.
```

---

## Task 1.2: Write Typing Engine Tests (RED)

**Status**: ✅ Complete

### Acceptance Criteria

- [x] Letter state transition tests (untyped → correct/incorrect/extra)
- [x] Character validation tests
- [x] Word completion tests (space advances to next word)
- [x] Error tracking tests
- [x] Backspace functionality tests
- [x] Edge case tests (empty word list, extra chars)

### Results

- 29 tests written covering all acceptance criteria
- Tests reference `./typing` which didn't exist at time of writing
- RED confirmed: `bun run test` failed with "Cannot find module './typing'"

### TDD Cycle Evidence

| Subtask | Test File        | Layer | Safety Net | RED        | GREEN     | TRIANGULATE     | REFACTOR           |
| ------- | ---------------- | ----- | ---------- | ---------- | --------- | --------------- | ------------------ |
| 1.2-1.3 | `typing.test.ts` | Unit  | N/A (new)  | ✅ Written | ✅ Passed | ✅ 6 edge cases | ✅ Type assertions |

---

## Task 1.3: Implement Typing Engine (GREEN)

**Status**: ✅ Complete

### Files Changed

- Created `src/engine/typing.ts`

### Implementation

- `TypingEngine` class with `type()`, `backspace()`, `getGameState()`, `isComplete()`
- Letter state machine: untyped → correct/incorrect → extra
- Word completion detection (word is completed when charsTyped >= originalLetterCount)
- Error tracking with `hasError` flag per word
- Extra character tracking beyond word length (push new Letter with "extra" state)
- Backspace resets letters to "untyped" and adjusts counts

### TypeScript Cleanup

- Added non-null assertions (`!`) for `noUncheckedIndexedAccess` compliance

### Tests

```
29 pass, 0 fail, 50 expect() calls
```

---

## Task 1.4: Write Timer Tests (RED)

**Status**: ✅ Complete

### Acceptance Criteria

- [x] Lifecycle tests (start, stop, isRunning)
- [x] Callback tests (onStart, onTick, onComplete)
- [x] Pause/resume tests
- [x] Time tracking tests (remaining seconds)
- [x] Edge case tests (0 duration, multiple starts)

### Design Adaptation

- Bun doesn't support `jest.useFakeTimers()` — used configurable `intervalMs` parameter (default 1000ms) to enable fast async tests
- Used `Bun.sleep()` for async wait patterns
- Used `mock()` from `bun:test` for callback spies

### Results

- 17 tests written
- RED confirmed: `bun run test` failed with "Cannot find module './timer'"

---

## Task 1.5: Implement Timer (GREEN)

**Status**: ✅ Complete

### Files Changed

- Created `src/engine/timer.ts`

### Implementation

- `Timer` class with configurable `intervalMs` (default 1000)
- `start()` — begins countdown, calls onStart immediately
- `pause()` — pauses interval, captures elapsed time
- `resume()` — resumes from elapsed time
- `stop()` — stops and resets elapsed to 0
- `isRunning()` — returns running state
- `getRemainingSeconds()` — returns remaining time in seconds (float)
- Handles 0 duration by completing immediately

### Tests

```
17 pass, 0 fail, 20 expect() calls
```

---

## Task 1.6: Write WPM Calculator Tests (RED)

**Status**: ✅ Complete

### Acceptance Criteria

- [x] Gross WPM formula tests
- [x] Raw WPM formula tests
- [x] Accuracy formula tests
- [x] Edge case tests (0 duration, 0 chars, large counts, fractional duration)

### Results

- 14 tests written
- RED confirmed: `bun run test` failed with "Cannot find module './wpm'"

---

## Task 1.7: Implement WPM Calculator (GREEN)

**Status**: ✅ Complete

### Files Changed

- Created `src/engine/wpm.ts`

### Implementation

- `WPMCalculator` class with `calculate(input: WPMInput)` method
- Gross WPM = `(correctChars / 5) / durationMinutes` (0 if no duration)
- Raw WPM = `(totalChars / 5) / durationMinutes` (0 if no duration)
- Accuracy = `correctChars / totalChars * 100` rounded to 1 decimal (100 if no chars)
- All WPM values rounded to nearest integer

### Tests

```
14 pass, 0 fail, 18 expect() calls
```

---

## Final Phase 1 Summary

### Test Results

```
60 pass, 0 fail, 88 expect() calls
Ran 60 tests across 3 files.
```

### TypeScript

```
bun run typecheck — 0 errors
```

### Files Created

| File                        | Lines | Description                             |
| --------------------------- | ----- | --------------------------------------- |
| `src/engine/typing.ts`      | ~120  | Typing engine with letter state machine |
| `src/engine/timer.ts`       | ~120  | Countdown timer with pause/resume       |
| `src/engine/wpm.ts`         | ~40   | WPM & accuracy calculator               |
| `src/engine/typing.test.ts` | ~260  | 29 typing engine tests                  |
| `src/engine/timer.test.ts`  | ~150  | 17 timer tests                          |
| `src/engine/wpm.test.ts`    | ~140  | 14 WPM calculator tests                 |

### TDD Cycle Evidence

| Task    | Test File        | Layer | Safety Net | RED        | GREEN     | TRIANGULATE     | REFACTOR           |
| ------- | ---------------- | ----- | ---------- | ---------- | --------- | --------------- | ------------------ |
| 1.1     | `*.test.ts`      | Unit  | N/A (new)  | ✅ Written | ✅ Passed | ➖ Placeholder  | ➖ None needed     |
| 1.2-1.3 | `typing.test.ts` | Unit  | N/A (new)  | ✅ Written | ✅ Passed | ✅ 6 edge cases | ✅ Type assertions |
| 1.4-1.5 | `timer.test.ts`  | Unit  | N/A (new)  | ✅ Written | ✅ Passed | ✅ 4 edge cases | ✅ Clean           |
| 1.6-1.7 | `wpm.test.ts`    | Unit  | N/A (new)  | ✅ Written | ✅ Passed | ✅ 3 edge cases | ✅ Clean           |

### Test Summary

- **Total tests written**: 60
- **Total tests passing**: 60
- **Layers used**: Unit (60)
- **Pure functions created**: 3 classes

### Deviations from Design

- Timer uses configurable `intervalMs` parameter instead of hardcoded 1000ms to enable fast async testing (Bun doesn't support `jest.useFakeTimers()`)
- Timer callbacks use `mock()` from `bun:test` instead of `jest.fn()`
- All class non-null assertions (`!`) added for `noUncheckedIndexedAccess` compliance

### Remaining Tasks (Phase 2+)

- Task 2.1: Create English word list
- Phase 3: UI Implementation (Menu, Game, Results screens)
- Phase 4: Integration & Testing
- Phase 5: Code Review & Polish
