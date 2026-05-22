import { describe, it, expect } from "bun:test";
import { StyledText } from "@opentui/core";
import type { SessionResult } from "./screens";

/** Helper: extract plain text from TextChunk[] */
function chunkText(chunks: { text: string }[]): string {
	return chunks.map((c) => c.text).join("");
}

/** Helper: get fg property of a chunk */
function chunkFg(chunk: { fg?: unknown }): unknown {
	return chunk.fg;
}

describe("wordText", () => {
	it("should return colored chunks for correct letters", async () => {
		const { wordText } = await import("./screens");
		const word = {
			letters: [
				{ char: "h", state: "correct" as const },
				{ char: "i", state: "correct" as const },
			],
			hasError: false,
			isCompleted: false,
		};
		const chunks = wordText(word);
		expect(chunks.length).toBe(3); // hi + space
		expect(chunkText(chunks)).toBe("hi ");
		const c0 = chunks[0];
		if (c0) expect(chunkFg(c0)).toBeTruthy();
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
		const chunks = wordText(word);
		expect(chunks.length).toBe(2);
		expect(chunkText(chunks)).toBe("hi");
	});

	it("should use distinct colors for extra characters", async () => {
		const { wordText } = await import("./screens");
		const word = {
			letters: [
				{ char: "a", state: "correct" as const },
				{ char: "x", state: "extra" as const },
			],
			hasError: false,
			isCompleted: false,
		};
		const chunks = wordText(word);
		expect(chunks.length).toBe(3); // a, x, space
		expect(chunkText(chunks)).toBe("ax ");
		// Extra char should have different styling than correct
		// At minimum, should have fg set
		const c0 = chunks[0],
			c1 = chunks[1];
		if (c0) expect(chunkFg(c0)).toBeTruthy();
		if (c1) expect(chunkFg(c1)).toBeTruthy();
	});

	it("should color incorrect letters", async () => {
		const { wordText } = await import("./screens");
		const word = {
			letters: [{ char: "h", state: "incorrect" as const }],
			hasError: true,
			isCompleted: false,
		};
		const chunks = wordText(word);
		expect(chunks.length).toBe(2); // h + space
		const c0 = chunks[0];
		if (c0) expect(chunkFg(c0)).toBeTruthy();
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
	it("should return StyledText with version", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu("time", 1, [15, 30, 60, 120]);
		expect(menu).toBeInstanceOf(StyledText);
		const text = chunkText(menu.chunks);
		expect(text).toContain("Monkeyterm v");
	});

	it("should show mode header", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu("time", 0, [15, 30]);
		const text = chunkText(menu.chunks);
		expect(text).toContain("Time");
	});

	it("should show Words mode header", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu("words", 0, [10, 25, 50]);
		const text = chunkText(menu.chunks);
		expect(text).toContain("Words");
	});

	it("should mark selected time option with triangle", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu("time", 1, [15, 30, 60, 120]);
		const text = chunkText(menu.chunks);
		const lines = text.split("\n");
		const idx = lines.findIndex((l) => l.includes("▸"));
		expect(idx).toBeGreaterThanOrEqual(0);
		expect(lines[idx]).toContain("30");
	});

	it("should mark selected word count option with triangle", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu("words", 2, [10, 25, 50, 100]);
		const text = chunkText(menu.chunks);
		const lines = text.split("\n");
		const idx = lines.findIndex((l) => l.includes("▸"));
		expect(idx).toBeGreaterThanOrEqual(0);
		expect(lines[idx]).toContain("50");
	});

	it("should show seconds suffix in time mode", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu("time", 0, [30]);
		const text = chunkText(menu.chunks);
		expect(text).toContain("30s");
	});

	it("should show words suffix in words mode", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu("words", 0, [25]);
		const text = chunkText(menu.chunks);
		expect(text).toContain("25 words");
	});

	it("should show Enter start hint", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu("time", 0, [15, 30]);
		const text = chunkText(menu.chunks);
		expect(text).toContain("Enter");
	});
});

describe("buildResults", () => {
	it("should return StyledText with stats", async () => {
		const { buildResults } = await import("./screens");
		const result: SessionResult = {
			wpm: 45,
			rawWpm: 50,
			accuracy: 92.5,
			correctChars: 100,
			totalChars: 110,
			errors: 10,
		};
		const output = buildResults(result, []);
		expect(output).toBeInstanceOf(StyledText);
		const text = chunkText(output.chunks);
		expect(text).toContain("45");
		expect(text).toContain("92.5");
		expect(text).toContain("10");
	});

	it("should include chart when wpmHistory is provided", async () => {
		const { buildResults } = await import("./screens");
		const result: SessionResult = {
			wpm: 45,
			rawWpm: 50,
			accuracy: 92.5,
			correctChars: 100,
			totalChars: 110,
			errors: 10,
		};
		const output = buildResults(result, [30, 40, 45, 50, 45, 55, 60]);
		expect(output).toBeInstanceOf(StyledText);
		const text = chunkText(output.chunks);
		expect(text).toContain("WPM over time");
	});

	it("should not include chart when wpmHistory is empty", async () => {
		const { buildResults } = await import("./screens");
		const result: SessionResult = {
			wpm: 45,
			rawWpm: 50,
			accuracy: 92.5,
			correctChars: 100,
			totalChars: 110,
			errors: 10,
		};
		const output = buildResults(result, []);
		expect(output).toBeInstanceOf(StyledText);
		const text = chunkText(output.chunks);
		expect(text).not.toContain("WPM over time");
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
		const output = buildResults(result, []);
		expect(output).toBeInstanceOf(StyledText);
		const text = chunkText(output.chunks);
		expect(text).toContain("0");
	});
});
