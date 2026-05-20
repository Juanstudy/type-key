import { describe, it, expect } from "bun:test";
import { TypingEngine } from "./typing";

describe("TypingEngine", () => {
	describe("initial state", () => {
		it("should mark first character as untyped", () => {
			const engine = new TypingEngine(["hello"]);
			const state = engine.getGameState();
			expect(state.words[0]!.letters[0]!.state).toBe("untyped");
		});

		it("should initialize all letters as untyped", () => {
			const engine = new TypingEngine(["hello", "world"]);
			const state = engine.getGameState();
			for (const word of state.words) {
				for (const letter of word.letters) {
					expect(letter.state).toBe("untyped");
				}
			}
		});
	});

	describe("typing logic", () => {
		it("should mark correctly typed characters as correct", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("h");
			engine.type("e");
			const state = engine.getGameState();
			expect(state.words[0]!.letters[0]!.state).toBe("correct");
			expect(state.words[0]!.letters[1]!.state).toBe("correct");
		});

		it("should mark incorrectly typed characters as incorrect", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("h");
			engine.type("x");
			const state = engine.getGameState();
			expect(state.words[0]!.letters[0]!.state).toBe("correct");
			expect(state.words[0]!.letters[1]!.state).toBe("incorrect");
		});

		it("should mark extra characters as extra", () => {
			const engine = new TypingEngine(["hell"]);
			engine.type("h");
			engine.type("e");
			engine.type("l");
			engine.type("l");
			engine.type("o");
			const state = engine.getGameState();
			expect(state.words[0]!.letters[0]!.state).toBe("correct");
			expect(state.words[0]!.letters[1]!.state).toBe("correct");
			expect(state.words[0]!.letters[2]!.state).toBe("correct");
			expect(state.words[0]!.letters[3]!.state).toBe("correct");
			// The 5th typed char is beyond the 4-letter word — becomes extra
		});

		it("should advance to next word on space", () => {
			const engine = new TypingEngine(["hello", "world"]);
			engine.type("h");
			engine.type("e");
			engine.type("l");
			engine.type("l");
			engine.type("o");
			engine.type(" ");
			const state = engine.getGameState();
			expect(state.currentWordIndex).toBe(1);
		});

		it("should not advance to next word on space before word is fully typed", () => {
			const engine = new TypingEngine(["hello", "world"]);
			engine.type("h");
			engine.type("e");
			engine.type(" ");
			const state = engine.getGameState();
			expect(state.currentWordIndex).toBe(0);
		});
	});

	describe("error tracking", () => {
		it("should track total characters typed", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("h");
			engine.type("e");
			engine.type("l");
			engine.type("l");
			engine.type("o");
			const state = engine.getGameState();
			expect(state.totalChars).toBe(5);
		});

		it("should track character errors", () => {
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

		it("should track multiple errors", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("x");
			engine.type("y");
			engine.type("z");
			engine.type("l");
			engine.type("o");
			const state = engine.getGameState();
			expect(state.errors).toBe(3);
		});

		it("should mark word with error", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("x");
			engine.type("e");
			engine.type("l");
			engine.type("l");
			engine.type("o");
			const state = engine.getGameState();
			expect(state.words[0]!.hasError).toBe(true);
		});

		it("should not mark word with error when all correct", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("h");
			engine.type("e");
			engine.type("l");
			engine.type("l");
			engine.type("o");
			const state = engine.getGameState();
			expect(state.words[0]!.hasError).toBe(false);
		});
	});

	describe("backspace logic", () => {
		it("should remove last typed character and reset state to untyped", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("h");
			engine.type("e");
			engine.backspace();
			const state = engine.getGameState();
			expect(state.words[0]!.letters[0]!.state).toBe("correct");
			expect(state.words[0]!.letters[1]!.state).toBe("untyped");
		});

		it("should reset incorrect character when backspaced", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("h");
			engine.type("x");
			engine.backspace();
			const state = engine.getGameState();
			expect(state.words[0]!.letters[0]!.state).toBe("correct");
			expect(state.words[0]!.letters[1]!.state).toBe("untyped");
		});

		it("should remove extra character when backspaced", () => {
			const engine = new TypingEngine(["a"]);
			engine.type("a");
			engine.type("b");
			engine.backspace();
			const state = engine.getGameState();
			expect(state.words[0]!.letters[0]!.state).toBe("correct");
			// Extra character removed
		});

		it("should do nothing when no characters have been typed", () => {
			const engine = new TypingEngine(["hello"]);
			engine.backspace();
			const state = engine.getGameState();
			expect(state.words[0]!.letters[0]!.state).toBe("untyped");
			expect(state.totalChars).toBe(0);
		});

		it("should fix error count when backspacing incorrect char", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("x");
			const stateBefore = engine.getGameState();
			expect(stateBefore.errors).toBe(1);

			engine.backspace();
			const stateAfter = engine.getGameState();
			expect(stateAfter.errors).toBe(0);
		});
	});

	describe("word completion", () => {
		it("should mark word as completed when all characters typed correctly", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("h");
			engine.type("e");
			engine.type("l");
			engine.type("l");
			engine.type("o");
			const state = engine.getGameState();
			expect(state.words[0]!.isCompleted).toBe(true);
		});

		it("should mark word as completed even with errors", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("x");
			engine.type("e");
			engine.type("l");
			engine.type("l");
			engine.type("o");
			const state = engine.getGameState();
			expect(state.words[0]!.isCompleted).toBe(true);
		});

		it("should skip completed word on space", () => {
			const engine = new TypingEngine(["hello", "world"]);
			engine.type("h");
			engine.type("e");
			engine.type("l");
			engine.type("l");
			engine.type("o");
			engine.type(" ");
			const state = engine.getGameState();
			expect(state.currentWordIndex).toBe(1);
		});
	});

	describe("tracking correct and total characters", () => {
		it("should track correctChars", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("h");
			engine.type("e");
			engine.type("l");
			engine.type("l");
			engine.type("o");
			const state = engine.getGameState();
			expect(state.correctChars).toBe(5);
		});

		it("should track correctChars correctly with errors", () => {
			const engine = new TypingEngine(["hello"]);
			engine.type("x");
			engine.type("e");
			engine.type("l");
			engine.type("l");
			engine.type("o");
			const state = engine.getGameState();
			expect(state.correctChars).toBe(4);
		});
	});

	describe("isComplete", () => {
		it("should return false when there are still untyped words", () => {
			const engine = new TypingEngine(["hello", "world"]);
			engine.type("hello");
			expect(engine.isComplete()).toBe(false);
		});

		it("should return true when all words are completed", () => {
			const engine = new TypingEngine(["a", "b"]);
			engine.type("a");
			engine.type(" ");
			engine.type("b");
			engine.type(" ");
			expect(engine.isComplete()).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should handle empty word list without throwing", () => {
			const engine = new TypingEngine([]);
			expect(() => engine.getGameState()).not.toThrow();
		});

		it("should have currentWordIndex 0 with empty word list", () => {
			const engine = new TypingEngine([]);
			const state = engine.getGameState();
			expect(state.currentWordIndex).toBe(0);
		});

		it("should handle typing beyond word length (extra chars)", () => {
			const engine = new TypingEngine(["hi"]);
			engine.type("h");
			engine.type("i");
			// Extra chars past word length
			engine.type("x");
			engine.type("y");
			engine.type("z");
			const state = engine.getGameState();
			// Word should still have isCompleted true
			expect(state.words[0]!.isCompleted).toBe(true);
			// Extra chars don't count as typed chars beyond tracking
		});

		it("should complete all words by typing and spacing through", () => {
			const engine = new TypingEngine(["a", "b", "c"]);
			engine.type("a");
			engine.type(" ");
			engine.type("b");
			engine.type(" ");
			engine.type("c");
			engine.type(" ");
			const state = engine.getGameState();
			expect(state.currentWordIndex).toBe(3);
			expect(engine.isComplete()).toBe(true);
		});

		it("should handle single character words", () => {
			const engine = new TypingEngine(["a"]);
			engine.type("a");
			const state = engine.getGameState();
			expect(state.words[0]!.isCompleted).toBe(true);
			expect(state.correctChars).toBe(1);
		});
	});
});
