# SDD Tasks: Mode Time End-to-End Implementation

**Change ID**: 01-mode-time
**Created**: 2026-05-17

---

## Task Breakdown

### Phase 1: Test-First Development (2-3 hours)

#### Task 1.1: Setup Test Infrastructure
**Estimated Time**: 15 minutes
**Priority**: P0
**Dependencies**: None

**Description**:
Create test files for typing engine, timer, and WPM calculator. Verify tests pass with Bun's test runner.

**Acceptance Criteria**:
- [ ] `src/engine/typing.test.ts` exists with basic test structure
- [ ] `src/engine/timer.test.ts` exists with basic test structure
- [ ] `src/engine/wpm.test.ts` exists with basic test structure
- [ ] `bun run test` runs without errors
- [ ] All test files show 0 tests (placeholder tests)

**Files to Create**:
- `src/engine/typing.test.ts`
- `src/engine/timer.test.ts`
- `src/engine/wpm.test.ts`

**Definition of Done**:
- [ ] All test files created
- [ ] `bun run test` executes successfully
- [ ] No TypeScript compilation errors
- [ ] Tests show 0 tests (placeholder state)

---

#### Task 1.2: Implement Typing Engine Tests
**Estimated Time**: 45 minutes
**Priority**: P0
**Dependencies**: Task 1.1

**Description**:
Write comprehensive unit tests for the typing engine covering:
- Letter state transitions
- Character validation
- Word completion
- Error tracking
- Backspace functionality
- Edge cases

**Acceptance Criteria**:
- [ ] All letter state tests pass (untyped → correct/incorrect/extra)
- [ ] Word completion tests pass
- [ ] Error tracking tests pass
- [ ] Backspace tests pass
- [ ] Edge case tests pass
- [ ] All tests pass (`bun run test`)

**Test Coverage**:
- Letter states (untyped, correct, incorrect, extra)
- Character validation (correct vs incorrect)
- Word completion (all characters typed)
- Space handling (advance to next word)
- Backspace handling (remove last character)
- Extra characters (beyond word length)
- Empty word list
- Complete all words

**Files to Create**:
- `src/engine/typing.test.ts` (complete)

**Definition of Done**:
- [ ] All typing engine tests pass
- [ ] No test failures
- [ ] Code coverage for typing engine > 90%

---

#### Task 1.3: Implement Typing Engine
**Estimated Time**: 1 hour
**Priority**: P0
**Dependencies**: Task 1.2

**Description**:
Implement the typing engine logic based on tests written in Task 1.2. Follow strict TDD: no implementation until tests exist.

**Acceptance Criteria**:
- [ ] All typing engine tests pass
- [ ] No TypeScript compilation errors
- [ ] Code follows project coding standards
- [ ] All public methods implemented
- [ ] No unused imports or code

**Implementation Details**:
- Create `src/engine/typing.ts`
- Implement `Letter` interface
- Implement `Word` interface
- Implement `TypingEngine` class
- Implement letter state machine
- Implement character validation
- Implement word completion detection
- Implement error tracking
- Implement backspace functionality

**Files to Create**:
- `src/engine/typing.ts`

**Definition of Done**:
- [ ] All typing engine tests pass
- [ ] `bun run typecheck` succeeds
- [ ] No console errors
- [ ] Code reviewed for quality

---

#### Task 1.4: Implement Timer Tests
**Estimated Time**: 30 minutes
**Priority**: P0
**Dependencies**: Task 1.1

**Description**:
Write comprehensive unit tests for the timer covering:
- Timer lifecycle (start, pause, resume, stop)
- Callback invocation (onStart, onTick, onComplete)
- Time tracking (remaining seconds)
- Edge cases (0 duration, multiple starts, overlapping intervals)

**Acceptance Criteria**:
- [ ] All lifecycle tests pass
- [ ] All callback tests pass
- [ ] All edge case tests pass
- [ ] All tests pass (`bun run test`)

**Test Coverage**:
- Timer start (onStart callback)
- Timer tick (onTick callback every second)
- Timer completion (onComplete callback)
- Timer pause (pause state)
- Timer resume (resume state)
- Timer stop (stop state)
- Remaining seconds tracking
- Multiple timer starts
- Timer drift (edge case)

**Files to Create**:
- `src/engine/timer.test.ts` (complete)

**Definition of Done**:
- [ ] All timer tests pass
- [ ] No test failures
- [ ] Code coverage for timer > 90%

---

#### Task 1.5: Implement Timer
**Estimated Time**: 30 minutes
**Priority**: P0
**Dependencies**: Task 1.4

**Description**:
Implement the timer logic based on tests written in Task 1.4.

**Acceptance Criteria**:
- [ ] All timer tests pass
- [ ] No TypeScript compilation errors
- [ ] Timer works correctly for all durations (15, 30, 60, 120s)
- [ ] No timer drift issues

**Implementation Details**:
- Create `src/engine/timer.ts`
- Implement `TimerCallback` type
- Implement `TimerCallbacks` interface
- Implement `Timer` class
- Implement `setInterval`-based timer
- Implement callback management
- Implement pause/resume/stop functionality
- Implement time tracking

**Files to Create**:
- `src/engine/timer.ts`

**Definition of Done**:
- [ ] All timer tests pass
- [ ] `bun run typecheck` succeeds
- [ ] Timer works correctly on all durations
- [ ] No timer drift

---

#### Task 1.6: Implement WPM Calculator Tests
**Estimated Time**: 30 minutes
**Priority**: P0
**Dependencies**: Task 1.1

**Description**:
Write comprehensive unit tests for the WPM calculator covering:
- Gross WPM calculation
- Raw WPM calculation
- Accuracy calculation
- Edge cases (0 duration, 0 characters, large counts)

**Acceptance Criteria**:
- [ ] All WPM calculation tests pass
- [ ] All edge case tests pass
- [ ] All tests pass (`bun run test`)

**Test Coverage**:
- Gross WPM formula
- Raw WPM formula
- Accuracy formula
- Division by zero handling
- 0 duration handling
- 0 characters handling
- Large character counts
- Very short duration (30 seconds)

**Files to Create**:
- `src/engine/wpm.test.ts` (complete)

**Definition of Done**:
- [ ] All WPM calculator tests pass
- [ ] No test failures
- [ ] Code coverage for WPM calculator > 90%

---

#### Task 1.7: Implement WPM Calculator
**Estimated Time**: 15 minutes
**Priority**: P0
**Dependencies**: Task 1.6

**Description**:
Implement the WPM calculator logic based on tests written in Task 1.6.

**Acceptance Criteria**:
- [ ] All WPM calculator tests pass
- [ ] No TypeScript compilation errors
- [ ] WPM calculations are accurate

**Implementation Details**:
- Create `src/engine/wpm.ts`
- Implement `WPMStats` interface
- Implement `WPMStatsInput` interface
- Implement `WPMCalculator` class
- Implement gross WPM calculation
- Implement raw WPM calculation
- Implement accuracy calculation
- Implement edge case handling

**Files to Create**:
- `src/engine/wpm.ts`

**Definition of Done**:
- [ ] All WPM calculator tests pass
- [ ] `bun run typecheck` succeeds
- [ ] WPM calculations are accurate

---

### Phase 2: Data Layer (1 hour)

#### Task 2.1: Create English Word List
**Estimated Time**: 20 minutes
**Priority**: P0
**Dependencies**: None

**Description**:
Create a sample English word list JSON file with 50-100 common English words.

**Acceptance Criteria**:
- [ ] `src/data/wordlists/english.json` exists
- [ ] Word list contains 50-100 words
- [ ] Words are sorted alphabetically
- [ ] Words are common English words
- [ ] No duplicate words
- [ ] No special characters or punctuation

**Implementation Details**:
- Create `src/data/wordlists/` directory
- Create `src/data/wordlists/english.json`
- Include common English words (the, be, to, of, and, a, in, that, have, i, it, for, not, on, with, he, as, you, do, at, this, but, his, by, from, they, we, say, her, she, or, an, will, my, one, all, would, there, their, what, so, up, out, if, about, who, get, which, go, me, etc.)
- Format as JSON array of strings

**Files to Create**:
- `src/data/wordlists/english.json`

**Definition of Done**:
- [ ] Word list file created
- [ ] Contains 50-100 words
- [ ] Words are valid English words
- [ ] No duplicates
- [ ] JSON is valid

---

### Phase 3: UI Implementation (4-5 hours)

#### Task 3.1: Implement Menu Screen
**Estimated Time**: 1 hour
**Priority**: P0
**Dependencies**: Task 1.3, Task 1.5, Task 1.7, Task 2.1

**Description**:
Implement the menu screen with time option selection.

**Acceptance Criteria**:
- [ ] Menu displays mode selection (Time/Words/Quotes)
- [ ] Menu displays time options (15, 30, 60, 120s)
- [ ] Arrow keys navigate between time options
- [ ] Enter key starts game with selected time option
- [ ] Menu renders correctly with OpenTUI
- [ ] No console errors

**Implementation Details**:
- Update `src/index.ts`
- Implement menu state (current time option index)
- Implement menu rendering with OpenTUI
- Implement arrow key navigation
- Implement Enter key to start game
- Display current time option with highlight

**Files to Modify**:
- `src/index.ts`

**Definition of Done**:
- [ ] Menu renders correctly
- [ ] Arrow keys navigate options
- [ ] Enter starts game
- [ ] No console errors
- [ ] Code reviewed

---

#### Task 3.2: Implement Game Screen
**Estimated Time**: 2 hours
**Priority**: P0
**Dependencies**: Task 3.1

**Description**:
Implement the game screen with typing, timer, and live WPM display.

**Acceptance Criteria**:
- [ ] Game displays 3 visible word lines
- [ ] Current word is highlighted (with cursor)
- [ ] Timer displays countdown
- [ ] Live WPM displays in real-time
- [ ] Correct characters appear green
- [ ] Incorrect characters appear red
- [ ] Extra characters appear yellow
- [ ] Space advances to next word
- [ ] Backspace removes last character
- [ ] Timer starts on first keystroke
- [ ] Timer completes when time expires
- [ ] Screen transitions to results on timer completion

**Implementation Details**:
- Update `src/index.ts`
- Implement game state (current word index, timer, typing engine)
- Implement game rendering with OpenTUI
- Integrate typing engine with game
- Integrate timer with game
- Integrate WPM calculator with game
- Implement word rendering (3 visible lines)
- Implement cursor rendering
- Implement live WPM display
- Implement timer display
- Implement character color coding
- Handle keystrokes and forward to typing engine
- Handle timer completion and transition to results

**Files to Modify**:
- `src/index.ts`

**Definition of Done**:
- [ ] Game renders correctly
- [ ] Timer works correctly
- [ ] WPM updates in real-time
- [ ] Character colors are correct
- [ ] Space advances to next word
- [ ] Backspace removes last character
- [ ] Timer completes and transitions to results
- [ ] No console errors

---

#### Task 3.3: Implement Results Screen
**Estimated Time**: 1 hour
**Priority**: P0
**Dependencies**: Task 3.2

**Description**:
Implement the results screen with final stats display.

**Acceptance Criteria**:
- [ ] Results screen displays WPM
- [ ] Results screen displays accuracy
- [ ] Results screen displays characters typed
- [ ] Results screen displays errors
- [ ] Tab key restarts test
- [ ] Esc key returns to menu
- [ ] Results screen renders correctly
- [ ] No console errors

**Implementation Details**:
- Update `src/index.ts`
- Implement results state (game result)
- Implement results rendering with OpenTUI
- Display final stats (WPM, accuracy, chars, errors)
- Implement Tab key to restart test
- Implement Esc key to return to menu
- Format stats for display

**Files to Modify**:
- `src/index.ts`

**Definition of Done**:
- [ ] Results screen renders correctly
- [ ] All stats display correctly
- [ ] Tab restarts test
- [ ] Esc returns to menu
- [ ] No console errors
- [ ] Code reviewed

---

#### Task 3.4: Implement Screen Router
**Estimated Time**: 1 hour
**Priority**: P0
**Dependencies**: Task 3.1, Task 3.2, Task 3.3

**Description**:
Implement state-based routing between screens (menu, game, results).

**Acceptance Criteria**:
- [ ] Current screen state is tracked
- [ ] Screen rendering is based on current screen
- [ ] Keystroke handling is based on current screen
- [ ] Screen transitions work correctly
- [ ] No screen rendering issues
- [ ] No console errors

**Implementation Details**:
- Update `src/index.ts`
- Implement screen state machine (menu → game → results → menu)
- Implement screen rendering based on current screen
- Implement keystroke handling based on current screen
- Implement screen transitions
- Ensure smooth transitions between screens

**Files to Modify**:
- `src/index.ts`

**Definition of Done**:
- [ ] Screen routing works correctly
- [ ] All screen transitions work
- [ ] No screen rendering issues
- [ ] No console errors
- [ ] Code reviewed

---

### Phase 4: Integration & Testing (2-3 hours)

#### Task 4.1: End-to-End Testing
**Estimated Time**: 1.5 hours
**Priority**: P0
**Dependencies**: Task 3.4

**Description**:
Perform comprehensive end-to-end testing of the complete game flow.

**Acceptance Criteria**:
- [ ] Complete test session works (menu → game → results → menu)
- [ ] All time options work (15, 30, 60, 120s)
- [ ] Error scenarios work (backspace, extra characters)
- [ ] Timer completion works correctly
- [ ] No runtime errors during full session
- [ ] All 11 acceptance criteria pass

**Test Scenarios**:
1. Menu → Game (15s) → Results → Menu
2. Menu → Game (30s) → Results → Menu
3. Menu → Game (60s) → Results → Menu
4. Menu → Game (120s) → Results → Menu
5. Test typing 10 correct words
6. Test typing with errors
7. Test backspace functionality
8. Test extra characters
9. Test timer completion
10. Test restart from results
11. Test return to menu from game

**Definition of Done**:
- [ ] All test scenarios pass
- [ ] No runtime errors
- [ ] All acceptance criteria verified

---

#### Task 4.2: Quality Checks
**Estimated Time**: 30 minutes
**Priority**: P0
**Dependencies**: Task 4.1

**Description**:
Run quality checks to ensure code meets project standards.

**Acceptance Criteria**:
- [ ] `bun run typecheck` passes with 0 errors
- [ ] `bun run test` passes with 0 failures
- [ ] No console errors during execution
- [ ] No console warnings
- [ ] Code follows project coding standards

**Quality Checks**:
- TypeScript compilation check
- Unit test execution
- Manual testing on multiple terminals (iTerm2, Terminal.app, xterm)
- Console error checking
- Console warning checking
- Code style review

**Definition of Done**:
- [ ] TypeScript compilation succeeds
- [ ] All tests pass
- [ ] No console errors
- [ ] No console warnings
- [ ] Code style reviewed

---

#### Task 4.3: Documentation Updates
**Estimated Time**: 30 minutes
**Priority**: P1
**Dependencies**: Task 4.2

**Description**:
Update project documentation to reflect new features.

**Acceptance Criteria**:
- [ ] README.md updated with Mode Time feature description
- [ ] README.md includes controls documentation
- [ ] README.md includes usage example
- [ ] No outdated information
- [ ] Documentation is clear and concise

**Documentation Updates**:
- Add Mode Time feature to README
- Document controls (Tab, Esc, Backspace, Ctrl+Backspace)
- Add usage example with screenshot description
- Update feature list
- Update roadmap (mark Phase 1 as complete)

**Files to Modify**:
- `README.md`

**Definition of Done**:
- [ ] README.md updated
- [ ] All features documented
- [ ] Controls listed
- [ ] Usage example included
- [ ] No outdated information

---

### Phase 5: Code Review & Polish (1 hour)

#### Task 5.1: Code Review Checklist
**Estimated Time**: 30 minutes
**Priority**: P0
**Dependencies**: Task 4.3

**Description**:
Perform comprehensive code review to ensure quality.

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] TypeScript compilation succeeds
- [ ] No console errors or warnings
- [ ] Code follows strict TDD principles
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Code is clean and readable
- [ ] No unused code or imports

**Review Checklist**:
- [ ] All unit tests pass
- [ ] TypeScript compilation succeeds
- [ ] No console errors or warnings
- [ ] Tests written before implementation (strict TDD)
- [ ] README.md updated
- [ ] No breaking changes
- [ ] Code is clean and readable
- [ ] No unused code or imports
- [ ] No commented-out code
- [ ] No debug console.logs
- [ ] Code follows project coding standards
- [ ] All 11 acceptance criteria verified

**Definition of Done**:
- [ ] Code review checklist completed
- [ ] All checklist items pass
- [ ] No issues found
- [ ] Ready for merge

---

#### Task 5.2: Code Cleanup
**Estimated Time**: 30 minutes
**Priority**: P1
**Dependencies**: Task 5.1

**Description**:
Clean up code to ensure it's production-ready.

**Acceptance Criteria**:
- [ ] No debug console.logs
- [ ] No commented-out code
- [ ] No unused imports
- [ ] No unused variables
- [ ] Code follows project coding standards
- [ ] Add comments where needed
- [ ] Ensure consistent code style

**Cleanup Tasks**:
- Remove all debug console.logs
- Remove all commented-out code
- Remove unused imports
- Remove unused variables
- Add comments for complex logic
- Ensure consistent code style (indentation, naming, formatting)
- Format code with prettier (if available)

**Definition of Done**:
- [ ] Code is clean and production-ready
- [ ] No debug code
- [ ] No commented-out code
- [ ] All imports are used
- [ ] All variables are used
- [ ] Code follows project coding standards

---

## Task Summary

| Phase | Task | Estimated Time | Priority |
|-------|------|----------------|----------|
| 1 | Setup Test Infrastructure | 15 min | P0 |
| 1 | Implement Typing Engine Tests | 45 min | P0 |
| 1 | Implement Typing Engine | 1 hour | P0 |
| 1 | Implement Timer Tests | 30 min | P0 |
| 1 | Implement Timer | 30 min | P0 |
| 1 | Implement WPM Calculator Tests | 30 min | P0 |
| 1 | Implement WPM Calculator | 15 min | P0 |
| 2 | Create English Word List | 20 min | P0 |
| 3 | Implement Menu Screen | 1 hour | P0 |
| 3 | Implement Game Screen | 2 hours | P0 |
| 3 | Implement Results Screen | 1 hour | P0 |
| 3 | Implement Screen Router | 1 hour | P0 |
| 4 | End-to-End Testing | 1.5 hours | P0 |
| 4 | Quality Checks | 30 min | P0 |
| 4 | Documentation Updates | 30 min | P1 |
| 5 | Code Review Checklist | 30 min | P0 |
| 5 | Code Cleanup | 30 min | P1 |
| **Total** | | **10-12 hours** | |

---

## Risk Mitigation

| Risk | Mitigation Action |
|------|-------------------|
| TDD discipline drift | Strict review requirement: no PR merge without passing tests |
| OpenTUI integration issues | Write component-level integration tests, use OpenTUI examples as reference |
| Timer edge cases | Unit tests for all timer edge cases, manual testing on all durations |
| WPM calculation errors | Comprehensive unit tests, edge case coverage (0 duration, 0 chars) |
| State management bugs | Isolate engine from UI, write integration tests for game flow |
| Terminal compatibility | Test on multiple terminals (iTerm2, Terminal.app, xterm) |

---

## Definition of Done (Overall)

- [ ] All unit tests pass (`bun run test`)
- [ ] TypeScript compilation succeeds (`bun run typecheck`)
- [ ] No console errors or warnings during execution
- [ ] Code follows strict TDD principles (tests before implementation)
- [ ] Documentation updated (README.md reflects new features)
- [ ] No breaking changes to existing API or behavior
- [ ] All 11 acceptance criteria verified
- [ ] Code review completed and approved
- [ ] Code cleanup completed
- [ ] Manual testing completed on multiple terminals
- [ ] No runtime errors during complete game session

---

**End of Tasks**