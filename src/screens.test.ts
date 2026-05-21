import { describe, it, expect } from "bun:test";
import type { SessionResult } from "./screens";

describe("wordText", () => {
	it("should join word letters and append space when not completed", async () => {
		const { wordText } = await import("./screens");
		const word = {
			letters: [
				{ char: "h", state: "correct" as const },
				{ char: "i", state: "correct" as const },
			],
			hasError: false,
			isCompleted: false,
		};
		expect(wordText(word)).toBe("hi ");
	});

	it("should not append space when completed", async () => {
		const { wordText } = await import("./screens");
		const word = {
			letters: [
				{ char: "h", state: "correct" as const },
				{ char: "i", state: "correct" as const },
			],
			hasError: false,
			isCompleted: true,
		};
		expect(wordText(word)).toBe("hi");
	});

	it("should include extra characters in output", async () => {
		const { wordText } = await import("./screens");
		const word = {
			letters: [
				{ char: "h", state: "correct" as const },
				{ char: "i", state: "correct" as const },
				{ char: "x", state: "extra" as const },
			],
			hasError: false,
			isCompleted: false,
		};
		expect(wordText(word)).toBe("hix ");
	});
});

describe("shuffleWords", () => {
	it("should return requested number of words", async () => {
		const { shuffleWords } = await import("./screens");
		const result = shuffleWords(5);
		expect(result.length).toBe(5);
	});

	it("should return strings", async () => {
		const { shuffleWords } = await import("./screens");
		const result = shuffleWords(3);
		result.forEach((w: string) => expect(typeof w).toBe("string"));
	});

	it("should not return more words than available", async () => {
		const { shuffleWords } = await import("./screens");
		const result = shuffleWords(999);
		expect(result.length).toBeLessThanOrEqual(200);
	});
});

describe("buildMenu", () => {
	it("should contain version", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu(1, [15, 30, 60, 120]);
		expect(menu).toContain("Monkeyterm v");
	});

	it("should mark selected option with triangle", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu(1, [15, 30, 60, 120]);
		const lines = menu.split("\n");
		expect(lines[5]).toContain("▸");
		expect(lines[4]).toContain("  "); // first option NOT selected
	});

	it("should mark first option with triangle when selected", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu(0, [15, 30]);
		const lines = menu.split("\n");
		expect(lines[4]).toContain("▸");
		expect(lines[5]).toContain("  ");
	});
});

describe("buildResults", () => {
	it("should show WPM, accuracy, and errors", async () => {
		const { buildResults } = await import("./screens");
		const result: SessionResult = {
			wpm: 45,
			rawWpm: 50,
			accuracy: 92.5,
			correctChars: 100,
			totalChars: 110,
			errors: 10,
		};
		const output = buildResults(result);
		expect(output).toContain("45");
		expect(output).toContain("92.5");
		expect(output).toContain("10");
	});

	it("should handle zero values", async () => {
		const { buildResults } = await import("./screens");
		const result: SessionResult = {
			wpm: 0,
			rawWpm: 0,
			accuracy: 100,
			correctChars: 0,
			totalChars: 0,
			errors: 0,
		};
		const output = buildResults(result);
		expect(output).toContain("0");
	});
});
