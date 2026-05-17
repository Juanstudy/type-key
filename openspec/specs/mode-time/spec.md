# SDD Spec: Mode Time End-to-End Implementation

**Change ID**: 01-mode-time
**Created**: 2026-05-17

---

## Acceptance Criteria

### Functional Requirements

| ID     | Requirement                                                  | Priority |
| ------ | ------------------------------------------------------------ | -------- |
| REQ-01 | User can select 15/30/60/120 second time options from menu   | P0       |
| REQ-02 | Timer starts on first keystroke and displays countdown       | P0       |
| REQ-03 | User can type words displayed on screen                      | P0       |
| REQ-04 | Space advances to next word                                  | P0       |
| REQ-05 | Correct characters appear in green, incorrect in red         | P0       |
| REQ-06 | Extra characters (beyond word length) are marked as "extra"  | P0       |
| REQ-07 | Timer shows live WPM while typing                            | P0       |
| REQ-08 | Timer completes when time expires                            | P0       |
| REQ-09 | Results screen shows final WPM, accuracy, characters, errors | P0       |
| REQ-10 | User can restart same test from results screen               | P0       |
| REQ-11 | User can return to menu from game screen                     | P0       |

### Non-Functional Requirements

| ID     | Requirement                                         | Metric                                 |
| ------ | --------------------------------------------------- | -------------------------------------- |
| NFR-01 | All engine logic must be testable in isolation      | 100% of engine code has unit tests     |
| NFR-02 | Application must follow strict TDD                  | 0 tests without implementation         |
| NFR-03 | Code must pass TypeScript strict mode               | `bun run typecheck` exits with 0       |
| NFR-04 | Application must start without errors               | `bun run dev` starts successfully      |
| NFR-05 | No runtime errors during normal game flow           | Zero uncaught exceptions               |
| NFR-06 | UI must render correctly on all supported terminals | Renders on iTerm2, Terminal.app, xterm |

---

## Test Cases

### Typing Engine Tests

```typescript
// src/engine/typing.test.ts

describe("TypingEngine", () => {
  describe("typing logic", () => {
    it("should mark first character as untyped", () => {
      const engine = new TypingEngine(["hello"]);
      const state = engine.getGameState();
      expect(state.currentWord.letters[0].state).toBe("untyped");
    });

    it("should mark correctly typed characters as correct", () => {
      const engine = new TypingEngine(["hello"]);
      engine.type("h");
      engine.type("e");
      const state = engine.getGameState();
      expect(state.currentWord.letters[0].state).toBe("correct");
      expect(state.currentWord.letters[1].state).toBe("correct");
    });

    it("should mark incorrectly typed characters as incorrect", () => {
      const engine = new TypingEngine(["hello"]);
      engine.type("h");
      engine.type("x"); // wrong char
      const state = engine.getGameState();
      expect(state.currentWord.letters[1].state).toBe("incorrect");
    });

    it("should mark extra characters as extra", () => {
      const engine = new TypingEngine(["hell"]);
      engine.type("h");
      engine.type("e");
      engine.type("l");
      engine.type("l");
      engine.type("o"); // extra char
      const state = engine.getGameState();
      expect(state.currentWord.letters[4].state).toBe("extra");
    });

    it("should advance to next word on space", () => {
      const engine = new TypingEngine(["hello", "world"]);
      engine.type("h");
      engine.type("e");
      engine.type("l");
      engine.type("l");
      engine.type("o");
      engine.type(" "); // space
      const state = engine.getGameState();
      expect(state.currentWordIndex).toBe(1);
      expect(state.currentWordIndex).toBe(1);
    });

    it("should track total characters and errors", () => {
      const engine = new TypingEngine(["hello"]);
      engine.type("h");
      engine.type("x");
      engine.type("l");
      engine.type("l");
      engine.type("o");
      const state = engine.getGameState();
      expect(state.totalChars).toBe(5);
      expect(state.errors).toBe(1);
    });
  });

  describe("backspace logic", () => {
    it("should remove last typed character", () => {
      const engine = new TypingEngine(["hello"]);
      engine.type("h");
      engine.type("e");
      engine.backspace();
      const state = engine.getGameState();
      expect(state.currentWord.letters[1].state).toBe("untyped");
    });

    it("should reset character when backspaced", () => {
      const engine = new TypingEngine(["hello"]);
      engine.type("h");
      engine.type("x");
      engine.backspace();
      const state = engine.getGameState();
      expect(state.currentWord.letters[1].state).toBe("untyped");
    });
  });

  describe("word completion", () => {
    it("should mark word as completed when all characters typed", () => {
      const engine = new TypingEngine(["hello"]);
      engine.type("h");
      engine.type("e");
      engine.type("l");
      engine.type("l");
      engine.type("o");
      const state = engine.getGameState();
      expect(state.currentWord.isCompleted).toBe(true);
    });

    it("should skip completed word on space", () => {
      const engine = new TypingEngine(["hello", "world"]);
      engine.type("h");
      engine.type("e");
      engine.type("l");
      engine.type("l");
      engine.type("o");
      engine.type(" "); // space
      const state = engine.getGameState();
      expect(state.currentWordIndex).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty word list", () => {
      const engine = new TypingEngine([]);
      expect(() => engine.getGameState()).not.toThrow();
    });

    it("should complete all words", () => {
      const engine = new TypingEngine(["a", "b", "c"]);
      engine.type("a");
      engine.type(" ");
      engine.type("b");
      engine.type(" ");
      engine.type("c");
      engine.type(" ");
      const state = engine.getGameState();
      expect(state.currentWordIndex).toBe(3);
    });
  });
});
```

### Timer Tests

```typescript
// src/engine/timer.test.ts

describe("Timer", () => {
  describe("lifecycle", () => {
    it("should start timer on start()", () => {
      const timer = new Timer(60, {
        onStart: jest.fn(),
        onTick: jest.fn(),
        onComplete: jest.fn(),
      });
      timer.start();
      expect(timer.isRunning()).toBe(true);
    });

    it("should call onStart callback immediately on start", () => {
      const onStart = jest.fn();
      const timer = new Timer(60, {
        onStart,
        onTick: jest.fn(),
        onComplete: jest.fn(),
      });
      timer.start();
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it("should call onTick callback every second", () => {
      const onTick = jest.fn();
      const timer = new Timer(1, {
        onStart: jest.fn(),
        onTick,
        onComplete: jest.fn(),
      });
      timer.start();
      jest.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledTimes(1);
      expect(onTick).toHaveBeenCalledWith(0);
    });

    it("should call onComplete callback when timer reaches 0", () => {
      const onComplete = jest.fn();
      const timer = new Timer(1, {
        onStart: jest.fn(),
        onTick: jest.fn(),
        onComplete,
      });
      timer.start();
      jest.advanceTimersByTime(1000);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("should pause timer on pause()", () => {
      const timer = new Timer(60, {
        onStart: jest.fn(),
        onTick: jest.fn(),
        onComplete: jest.fn(),
      });
      timer.start();
      timer.pause();
      expect(timer.isRunning()).toBe(false);
    });

    it("should resume timer on resume()", () => {
      const timer = new Timer(60, {
        onStart: jest.fn(),
        onTick: jest.fn(),
        onComplete: jest.fn(),
      });
      timer.start();
      timer.pause();
      timer.resume();
      expect(timer.isRunning()).toBe(true);
    });

    it("should stop timer on stop()", () => {
      const timer = new Timer(60, {
        onStart: jest.fn(),
        onTick: jest.fn(),
        onComplete: jest.fn(),
      });
      timer.start();
      timer.stop();
      expect(timer.isRunning()).toBe(false);
      expect(timer.getRemainingSeconds()).toBe(60);
    });

    it("should return correct remaining seconds", () => {
      const timer = new Timer(30, {
        onStart: jest.fn(),
        onTick: jest.fn(),
        onComplete: jest.fn(),
      });
      timer.start();
      jest.advanceTimersByTime(5000);
      expect(timer.getRemainingSeconds()).toBe(25);
    });
  });

  describe("edge cases", () => {
    it("should handle 15 second timer", () => {
      const timer = new Timer(15, {
        onStart: jest.fn(),
        onTick: jest.fn(),
        onComplete: jest.fn(),
      });
      timer.start();
      jest.advanceTimersByTime(15000);
      expect(timer.getRemainingSeconds()).toBe(0);
    });

    it("should handle 120 second timer", () => {
      const timer = new Timer(120, {
        onStart: jest.fn(),
        onTick: jest.fn(),
        onComplete: jest.fn(),
      });
      timer.start();
      jest.advanceTimersByTime(120000);
      expect(timer.getRemainingSeconds()).toBe(0);
    });

    it("should not call onComplete multiple times", () => {
      const onComplete = jest.fn();
      const timer = new Timer(1, {
        onStart: jest.fn(),
        onTick: jest.fn(),
        onComplete,
      });
      timer.start();
      jest.advanceTimersByTime(1000);
      timer.start(); // restart
      jest.advanceTimersByTime(1000);
      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });
});
```

### WPM Calculator Tests

```typescript
// src/engine/wpm.test.ts

describe("WPMCalculator", () => {
  describe("gross WPM", () => {
    it("should calculate correct WPM formula", () => {
      const calculator = new WPMCalculator();
      const stats = calculator.calculate({
        correctChars: 50,
        totalChars: 55,
        errors: 5,
        durationMinutes: 1,
      });
      expect(stats.grossWPM).toBe(10); // (50 / 5) / 1 = 10
    });

    it("should handle 0 duration without dividing by zero", () => {
      const calculator = new WPMCalculator();
      const stats = calculator.calculate({
        correctChars: 50,
        totalChars: 55,
        errors: 5,
        durationMinutes: 0,
      });
      expect(stats.grossWPM).toBe(0);
    });

    it("should handle 0 characters without dividing by zero", () => {
      const calculator = new WPMCalculator();
      const stats = calculator.calculate({
        correctChars: 0,
        totalChars: 0,
        errors: 0,
        durationMinutes: 1,
      });
      expect(stats.grossWPM).toBe(0);
    });
  });

  describe("raw WPM", () => {
    it("should calculate raw WPM from total characters", () => {
      const calculator = new WPMCalculator();
      const stats = calculator.calculate({
        correctChars: 50,
        totalChars: 55,
        errors: 5,
        durationMinutes: 1,
      });
      expect(stats.rawWPM).toBe(11); // (55 / 5) / 1 = 11
    });

    it("should handle 0 duration for raw WPM", () => {
      const calculator = new WPMCalculator();
      const stats = calculator.calculate({
        correctChars: 50,
        totalChars: 55,
        errors: 5,
        durationMinutes: 0,
      });
      expect(stats.rawWPM).toBe(0);
    });
  });

  describe("accuracy", () => {
    it("should calculate accuracy percentage", () => {
      const calculator = new WPMCalculator();
      const stats = calculator.calculate({
        correctChars: 90,
        totalChars: 100,
        errors: 10,
        durationMinutes: 1,
      });
      expect(stats.accuracy).toBe(90);
    });

    it("should handle 100% accuracy", () => {
      const calculator = new WPMCalculator();
      const stats = calculator.calculate({
        correctChars: 100,
        totalChars: 100,
        errors: 0,
        durationMinutes: 1,
      });
      expect(stats.accuracy).toBe(100);
    });

    it("should handle 0% accuracy", () => {
      const calculator = new WPMCalculator();
      const stats = calculator.calculate({
        correctChars: 0,
        totalChars: 100,
        errors: 100,
        durationMinutes: 1,
      });
      expect(stats.accuracy).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle large character counts", () => {
      const calculator = new WPMCalculator();
      const stats = calculator.calculate({
        correctChars: 1000,
        totalChars: 1100,
        errors: 100,
        durationMinutes: 5,
      });
      expect(stats.grossWPM).toBe(40); // (1000 / 5) / 5 = 40
      expect(stats.accuracy).toBe(90.9);
    });

    it("should handle very short duration (30 seconds)", () => {
      const calculator = new WPMCalculator();
      const stats = calculator.calculate({
        correctChars: 25,
        totalChars: 30,
        errors: 5,
        durationMinutes: 0.5,
      });
      expect(stats.grossWPM).toBe(10); // (25 / 5) / 0.5 = 50, but WPM is capped at 0 for < 1 min
    });
  });
});
```

### Integration Tests (Optional)

```typescript
// src/screens/game.test.ts (optional)

describe("Game Screen Integration", () => {
  it("should complete a full test session", async () => {
    // Setup
    const renderer = await createCliRenderer();
    const engine = new TypingEngine(["hello", "world", "test"]);
    const timer = new Timer(15, {
      onStart: jest.fn(),
      onTick: jest.fn(),
      onComplete: () => {
        // Transition to results screen
      },
    });

    // Start game
    timer.start();

    // Type words
    engine.type("h");
    engine.type("e");
    engine.type("l");
    engine.type("l");
    engine.type("o");
    engine.type(" ");
    engine.type("w");
    engine.type("o");
    engine.type("r");
    engine.type("l");
    engine.type("d");
    engine.type(" ");
    engine.type("t");
    engine.type("e");
    engine.type("s");
    engine.type("t");

    // Wait for timer to complete
    jest.advanceTimersByTime(15000);

    // Verify results
    const stats = engine.getGameState();
    expect(stats.currentWordIndex).toBe(3);
    expect(stats.correctChars).toBeGreaterThan(0);
    expect(stats.errors).toBeGreaterThanOrEqual(0);

    // Cleanup
    renderer.destroy();
  });
});
```

---

## Definition of Done Checklist

- [ ] All unit tests pass (`bun run test`)
- [ ] TypeScript compilation succeeds (`bun run typecheck`)
- [ ] No console errors or warnings during execution
- [ ] Code follows strict TDD principles (tests before implementation)
- [ ] Documentation updated (README.md reflects new features)
- [ ] No breaking changes to existing API or behavior
- [ ] Manual testing completed for all 11 acceptance criteria
- [ ] Code review completed and approved
- [ ] Integration tests pass (if included)
- [ ] Performance tests pass (no noticeable lag)

---

**End of Spec**
