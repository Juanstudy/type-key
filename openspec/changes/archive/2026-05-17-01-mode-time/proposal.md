# SDD Proposal: Mode Time End-to-End Implementation

**Change ID**: 01-mode-time
**Status**: Draft
**Priority**: P0 (MVP)
**Owner**: Juanstudy
**Created**: 2026-05-17
**Estimated Risk**: Low (purely additive, no breaking changes)

---

## 1. Problem Statement

The type-key project currently has no functional typing test implementation. The application only renders a basic placeholder screen that shows "Monkeyterm v1.0.0 — Press any key to start". Users cannot actually practice typing with any measurable metrics.

### Critical Gaps

1. **No typing engine**: No logic to process keystrokes, validate characters, track errors, or determine word completion
2. **No timer**: No mechanism to track elapsed time, enforce time limits, or handle timer completion
3. **No WPM calculation**: No way to compute typing speed metrics (WPM, accuracy, raw WPM)
4. **No UI screens**: No menu, game, or results screens to present the typing experience
5. **No game loop**: No state management or routing between different views/screens
6. **No test coverage**: No unit tests for the engine logic, violating the strict_tdd requirement

### Business Impact

- **Zero user value**: The application has no functional typing capability
- **Misaligned with PRD**: The PRD specifies a working typing test as the MVP deliverable
- **Technical debt**: Implementing these features later would require architectural changes
- **Cannot demonstrate value**: No way to show the product to stakeholders or users

---

## 2. Proposed Solution

Implement a **complete vertical slice** of the Mode Time feature that enables users to practice typing with a time-based test. This includes all core engine logic, UI screens, and test coverage for the MVP.

### Scope

#### In Scope

1. **Typing Engine** (`src/engine/typing.ts`)
   - Letter state machine: untyped → correct/incorrect → extra
   - Space advances to next word
   - Character comparison and validation
   - Word completion detection
   - Error tracking (character vs word errors)

2. **Timer** (`src/engine/timer.ts`)
   - `setInterval`-based timer
   - Configurable durations: 15, 30, 60, 120 seconds
   - Callbacks: `onStart`, `onTick`, `onComplete`
   - Pause/resume capability (future-proofing)

3. **WPM Calculator** (`src/engine/wpm.ts`)
   - Gross WPM = (correct characters / 5) / minutes
   - Accuracy = (correct characters / total characters) \* 100
   - Raw WPM = (total characters / 5) / minutes

4. **UI Screens**
   - **Menu Screen**: Mode selection (Time/Words/Quotes), time option selection
   - **Game Screen**: Live typing, timer display, current word, progress bar, live WPM
   - **Results Screen**: Final stats (WPM, accuracy, characters, errors), restart option
   - **Screen Router**: State-based routing between screens in `src/index.ts`

5. **Data Layer**
   - `src/data/wordlists/english.json`: Sample English wordlist (50-100 words)
   - Session result logging to console (no database yet)

6. **Test Coverage**
   - Unit tests for typing engine (`src/engine/typing.test.ts`)
   - Unit tests for timer (`src/engine/timer.test.ts`)
   - Unit tests for WPM calculator (`src/engine/wpm.test.ts`)
   - Integration tests for screen interactions (optional)
   - Strict TDD: All code written after tests (no feature code without tests)

#### Out of Scope (for this change)

1. **Words Mode**: Fixed word count (10/25/50/100) - deferred to Phase 2
2. **Quotes Mode**: Quote-based typing - deferred to Phase 2
3. **History Screen**: Session history with ASCII charts - deferred to Phase 3
4. **Database Persistence**: SQLite for storing results - deferred to Phase 3
5. **Configuration Persistence**: Save/load user preferences - deferred to Phase 3
6. **Keyboard Customization**: Ctrl+Backspace, different keybindings - deferred to Phase 2
7. **Language Support**: Spanish wordlists - deferred to Phase 2
8. **Themes**: Dracula, Nord, Catppuccin - deferred to post-MVP
9. **Code Mode**: Typing code snippets - deferred to post-MVP
10. **Custom Wordlists**: User-defined word sources - deferred to post-MVP

---

## 3. Success Criteria

### Functional Requirements (MVP)

| ID     | Requirement                                                  | Acceptance Test                                                                |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| REQ-01 | User can select 15/30/60/120 second time options from menu   | Press arrow keys → menu shows selected option highlighted → Enter starts timer |
| REQ-02 | Timer starts on first keystroke and displays countdown       | Press any key → timer shows decreasing seconds (120s, 119s...)                 |
| REQ-03 | User can type words displayed on screen                      | Type letters → they appear in correct state color                              |
| REQ-04 | Space advances to next word                                  | Type space → cursor moves to next word                                         |
| REQ-05 | Correct characters appear in green, incorrect in red         | Type 'a' when expected 'e' → 'e' appears red, 'a' appears red                  |
| REQ-06 | Extra characters (beyond word length) are marked as "extra"  | Type 'hello' when word is 'hell' → 'o' appears with "extra" state              |
| REQ-07 | Timer shows live WPM while typing                            | WPM counter updates in real-time as user types                                 |
| REQ-08 | Timer completes when time expires                            | Screen transitions to results after countdown reaches 0                        |
| REQ-09 | Results screen shows final WPM, accuracy, characters, errors | Screen displays: WPM: 65, Accuracy: 92%, Chars: 325, Errors: 27                |
| REQ-10 | User can restart same test from results screen               | Press Tab → returns to menu with same settings                                 |
| REQ-11 | User can return to menu from game screen                     | Press Esc → transitions to menu screen                                         |

### Non-Functional Requirements

| ID     | Requirement                                         | Metric                                                      |
| ------ | --------------------------------------------------- | ----------------------------------------------------------- |
| NFR-01 | All engine logic must be testable in isolation      | 100% of engine code has unit tests, 0% untested             |
| NFR-02 | Application must follow strict TDD                  | 0 tests without implementation, 100% tests passing          |
| NFR-03 | Code must pass TypeScript strict mode               | `bun run typecheck` exits with 0                            |
| NFR-04 | Application must start without errors               | `bun run dev` or `bun run src/index.ts` starts successfully |
| NFR-05 | No runtime errors during normal game flow           | Zero uncaught exceptions during a complete test session     |
| NFR-06 | UI must render correctly on all supported terminals | Renders properly on iTerm2, Terminal.app, xterm, etc.       |

### Definition of Done

- [ ] All acceptance tests pass (`bun run test`)
- [ ] TypeScript compilation succeeds (`bun run typecheck`)
- [ ] No console errors or warnings during execution
- [ ] Code follows project coding standards (strict TDD)
- [ ] Documentation updated (README.md reflects new features)
- [ ] No breaking changes to existing API or behavior
- [ ] Rollback plan documented and tested (if applicable)

---

## 4. Technical Design Decisions

### 4.1 Typing Engine Architecture

**File**: `src/engine/typing.ts`

```typescript
export interface Letter {
  char: string;
  state: LetterState; // "untyped" | "correct" | "incorrect" | "extra"
}

export interface Word {
  letters: Letter[];
  hasError: boolean;
  isCompleted: boolean;
}

export class TypingEngine {
  private currentWord: Word;
  private currentWordIndex: number;
  private words: Word[];
  private currentCharIndex: number;
  private correctChars: number;
  private totalChars: number;
  private errors: number;

  constructor(words: string[], language: Language);
  void type(char: string): void;
  void backspace(): void;
  void skipWord(): void;
  void reset(): void;
  void complete(): void;
  getGameState(): GameState;
}
```

**Design Rationale**:

- **State machine approach**: Clear separation between untyped, correct, incorrect, and extra states
- **Incremental updates**: Each keystroke updates only affected letter, not entire state
- **Isolation**: Engine doesn't depend on UI or timer, making it easy to test
- **Scalability**: Can be extended for Words Mode and Quotes Mode without changes

### 4.2 Timer Implementation

**File**: `src/engine/timer.ts`

```typescript
export type TimerCallback = () => void;

export class Timer {
  private intervalId: NodeJS.Timeout | null = null;
  private remainingSeconds: number;
  private running: boolean;
  private callbacks: {
    onStart: TimerCallback;
    onTick: (seconds: number) => void;
    onComplete: TimerCallback;
  };

  constructor(seconds: number, callbacks: TimerCallbacks);
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  getRemainingSeconds(): number;
  isRunning(): boolean;
}
```

**Design Rationale**:

- **setInterval-based**: Simple and reliable for 15-120 second durations
- **Callback pattern**: Decouples timer from game logic, easy to test
- **Pause/resume**: Future-proofing for potential pause feature
- **Configurable durations**: Supports all required time options

### 4.3 WPM Calculation

**File**: `src/engine/wpm.ts`

```typescript
export interface WPMStats {
  grossWPM: number;
  rawWPM: number;
  accuracy: number;
}

export class WPMCalculator {
  calculate(stats: {
    correctChars: number;
    totalChars: number;
    errors: number;
    durationMinutes: number;
  }): WPMStats;
}
```

**Design Rationale**:

- **Standard formula**: Gross WPM = (correct chars / 5) / minutes (industry standard)
- **Raw WPM**: Total chars / 5 / minutes (measures raw typing speed without accuracy penalty)
- **Accuracy**: Simple percentage calculation
- **Flexibility**: Can be reused for Words Mode (different formula: words / time / 5)

### 4.4 UI Architecture (OpenTUI)

**File**: `src/index.ts`

```typescript
type Screen = "menu" | "game" | "results";

class App {
  private renderer: CliRenderer;
  private currentScreen: Screen;
  private gameConfig: GameConfig;
  private typingEngine: TypingEngine;
  private timer: Timer;

  constructor();
  async renderMenu(): Promise<void>;
  async renderGame(): Promise<void>;
  async renderResults(): Promise<void>;
  handleKeystroke(key: string): void;
  startGame(): void;
}
```

**Design Rationale**:

- **Single screen per view**: OpenTUI core limitation, no navigation between screens
- **State-based routing**: Simple switch statement based on `currentScreen`
- **Renderer request**: `renderer.requestRender()` after each keystroke for immediate feedback
- **3 visible word lines**: Shows current word + next 2 words, scroll on overflow
- **Blinking cursor**: Visual feedback at current character position

### 4.5 Word List

**File**: `src/data/wordlists/english.json`

```json
[
  "the",
  "be",
  "to",
  "of",
  "and",
  "a",
  "in",
  "that",
  "have",
  "i",
  "it",
  "for",
  "not",
  "on",
  "with",
  "he",
  "as",
  "you",
  "do",
  "at"
]
```

**Design Rationale**:

- **Sample list**: 50-100 common English words for MVP
- **No database yet**: Session results logged to console (deferred to Phase 3)
- **Easy to extend**: Can add more words or different languages later
- **No external dependencies**: Fully offline, no API calls

---

## 5. Risk Assessment

### Risks & Mitigations

| Risk                                                                 | Probability | Impact | Mitigation                                                                               |
| -------------------------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------------------------- |
| **TDD discipline drift**: Developer writes code before tests         | Medium      | High   | Strict review requirement: no PR merge without passing tests                             |
| **OpenTUI integration issues**: Renderer not rendering as expected   | Low         | Medium | Write component-level integration tests, use OpenTUI examples as reference               |
| **Timer edge cases**: Timer not stopping at 0, overlapping intervals | Low         | High   | Unit tests for all timer edge cases, manual testing on all durations                     |
| **WPM calculation errors**: Incorrect formula or division by zero    | Low         | Medium | Comprehensive unit tests, edge case coverage (0 duration, 0 chars)                       |
| **State management bugs**: Engine state getting out of sync with UI  | Medium      | High   | Isolate engine from UI, write integration tests for game flow                            |
| **Terminal compatibility**: Rendering issues on different terminals  | Low         | Medium | Test on multiple terminals (iTerm2, Terminal.app, xterm), use escape sequences carefully |

### Rollback Plan

If this change causes critical issues:

1. **Immediate rollback**: Revert the CHANGE commit, restore previous index.ts
2. **Test rollback**: Run `bun run typecheck` and `bun run test` to verify no regressions
3. **Fix identified issues**: Address root cause, create new commit
4. **Document lessons learned**: Update engineering practices if needed

**Rollback complexity**: Low (purely additive changes, no breaking changes to existing API)

---

## 6. Implementation Plan

### Phase 1: Test-First Development (2-3 hours)

1. **Setup test infrastructure**
   - Create `src/engine/typing.test.ts` with typing engine tests
   - Create `src/engine/timer.test.ts` with timer tests
   - Create `src/engine/wpm.test.ts` with WPM calculator tests
   - Verify tests pass with `bun run test`

2. **Implement Typing Engine**
   - Write tests for letter states, word completion, error tracking
   - Implement `src/engine/typing.ts` (no implementation until tests exist)
   - Verify all tests pass

3. **Implement Timer**
   - Write tests for timer lifecycle (start, pause, resume, stop)
   - Implement `src/engine/timer.ts`
   - Verify all tests pass

4. **Implement WPM Calculator**
   - Write tests for all WPM formulas
   - Implement `src/engine/wpm.ts`
   - Verify all tests pass

### Phase 2: Data Layer (1 hour)

1. **Create Word List**
   - Create `src/data/wordlists/english.json` with sample words
   - Write simple test to verify file loads correctly

### Phase 3: UI Implementation (4-5 hours)

1. **Menu Screen**
   - Implement `src/index.ts` with menu state and rendering
   - Add arrow key navigation for time options
   - Add Enter to start game

2. **Game Screen**
   - Integrate typing engine with UI
   - Implement live WPM display
   - Implement timer display
   - Implement 3 visible word lines
   - Implement blinking cursor

3. **Results Screen**
   - Display final stats (WPM, accuracy, chars, errors)
   - Add Tab to restart
   - Add Esc to return to menu

4. **Screen Router**
   - Implement state-based routing
   - Handle keyboard events based on current screen
   - Ensure smooth transitions between screens

### Phase 4: Integration & Testing (2-3 hours)

1. **End-to-end testing**
   - Run complete test session (menu → game → results → menu)
   - Test all time options (15, 30, 60, 120s)
   - Test error scenarios (backspace, extra characters)
   - Test timer completion

2. **Quality checks**
   - Run `bun run typecheck` (must pass)
   - Run `bun run test` (must pass)
   - Check for console errors
   - Verify rendering on multiple terminals

3. **Documentation**
   - Update README.md to reflect new features
   - Document controls (Tab, Esc, Backspace, Ctrl+Backspace)
   - Add usage example

### Phase 5: Code Review & Polish (1 hour)

1. **Review checklist**
   - All tests passing
   - TypeScript compilation successful
   - No console errors
   - Code follows TDD principles
   - Documentation updated

2. **Code cleanup**
   - Remove debug console.logs
   - Add comments where needed
   - Ensure consistent code style

---

## 7. Success Metrics

### Code Quality

- **Test coverage**: 100% of engine code has unit tests
- **Test pass rate**: 100% (0 failures, 0 skips)
- **TypeScript strict mode**: 0 errors
- **Code review iterations**: 0 (first review passes)

### Functional Validation

- **Manual test scenarios**: All 11 acceptance tests pass
- **Terminal compatibility**: Renders correctly on at least 2 different terminals
- **Performance**: Game loop responds within 16ms (60fps target) on keystroke

### Business Value

- **MVP completion**: Mode Time feature fully functional
- **User experience**: Users can complete a full typing test session
- **Foundation**: Engine logic testable and reusable for future features

---

## 8. Open Questions & Decisions

### Decisions Already Made

1. **Strict TDD**: All code must be written after tests (config.yaml: strict_tdd: true)
2. **No database yet**: Session results logged to console (temporary)
3. **Single-screen routing**: OpenTUI core limitation, no screen navigation
4. **Sample wordlist**: 50-100 common English words in JSON
5. **setInterval-based timer**: Simple and reliable for MVP

### Pending Decisions (require supervisor approval)

1. **Wordlist size**: 50 vs 100 words for MVP? (recommend 50 for faster game loops)
2. **Live WPM update frequency**: Update on each keystroke vs each second? (recommend each keystroke)
3. **Extra character handling**: Show as "extra" state or just append to word? (recommend "extra" state)
4. **Error color scheme**: Red for incorrect, green for correct, gray for untyped? (recommend red/green/gray)
5. **Timer start delay**: Start immediately on first keystroke vs after 1 second? (recommend immediately)

### Questions for Supervisor

1. **Should I implement Words Mode in this change** or stick to Time Mode for MVP purity?
2. **What is the preferred wordlist size** for this MVP (50 vs 100 words)?
3. **Should I add integration tests** for screen interactions or focus on unit tests only?
4. **Is the current scope adequate** for a complete vertical slice, or should I add any features from Phase 2?

---

## 9. Conclusion

This SDD proposal defines a complete vertical slice implementation of the Mode Time feature for type-key. By implementing all core engine logic (typing engine, timer, WPM calculator), UI screens (menu, game, results), and test coverage using strict TDD, this change will deliver a fully functional typing test MVP that users can actually use.

The proposed solution balances MVP purity (Time Mode only) with future extensibility (engine designed for Words and Quotes modes). The strict TDD approach ensures code quality and prevents regression bugs, while the modular architecture makes future enhancements straightforward.

**Estimated effort**: 10-12 hours (2-3 days)
**Risk level**: Low (purely additive, no breaking changes)
**Dependencies**: None (can be implemented independently)
**Blocking issues**: None

---

## Appendix A: File Structure

```
openspec/changes/01-mode-time/
├── proposal.md              # This file
├── design.md                 # Detailed technical design (to be written)
├── spec.md                   # Acceptance criteria and test cases (to be written)
└── tasks.md                  # Task breakdown (to be written)
```

**Existing relevant files**:

- `src/index.ts` - Entry point (currently basic placeholder)
- `src/lib/types.ts` - Shared types (Letter, Word, GameMode, etc.)
- `src/data/wordlists/english.json` - Word list (to be created)
- `openspec/config.yaml` - Project configuration (strict_tdd: true)

**New files to be created**:

- `src/engine/typing.ts` - Typing engine logic
- `src/engine/typing.test.ts` - Typing engine unit tests
- `src/engine/timer.ts` - Timer logic
- `src/engine/timer.test.ts` - Timer unit tests
- `src/engine/wpm.ts` - WPM calculator
- `src/engine/wpm.test.ts` - WPM unit tests
- `src/data/wordlists/english.json` - Sample English wordlist
- `src/screens/menu.ts` - Menu screen (can be inline in index.ts for MVP)
- `src/screens/game.ts` - Game screen (can be inline in index.ts for MVP)
- `src/screens/results.ts` - Results screen (can be inline in index.ts for MVP)

---

**End of Proposal**
