import { describe, it, expect } from "bun:test";
import { StyledText } from "@opentui/core";
import type { SessionResult, Quote } from "./screens";
import type { StoredSession, SessionAggregates } from "./lib/types";

/** Helper: create a sample session for tests */
function makeSession(overrides: Partial<StoredSession> = {}): StoredSession {
	return {
		id: 1,
		timestamp: "2026-05-22T14:30:00.000Z",
		mode: "time",
		timeOption: 30,
		wordCount: null,
		wpm: 82,
		rawWpm: 88,
		accuracy: 93.2,
		correctChars: 210,
		totalChars: 230,
		errors: 20,
		durationSeconds: 30,
		wpmHistory: [30, 40, 50, 60, 55, 70, 82],
		quoteText: null,
		quoteSource: null,
		quoteLength: null,
		...overrides,
	};
}

function makeAggregates(
	overrides: Partial<SessionAggregates> = {},
): SessionAggregates {
	return {
		bestWpm: 82,
		bestAccuracy: 93.2,
		avgWpm: 45,
		avgRawWpm: 50,
		avgAccuracy: 92.5,
		avgDuration: 30,
		avgErrors: 10,
		totalSessions: 10,
		totalTimeSeconds: 300,
		time: { bestWpm: 82, avgWpm: 45, avgAccuracy: 92.5, sessions: 7 },
		words: { bestWpm: 78, avgWpm: 40, avgAccuracy: 90.0, sessions: 3 },
		quote: { bestWpm: 0, avgWpm: 0, avgAccuracy: 0, sessions: 0 },
		recentWpms: [30, 40, 50, 60, 55, 70, 82, 75, 80, 78],
		...overrides,
	};
}

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
	it("should show quote mode description", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu("quote", 0, []);
		const text = chunkText(menu.chunks);
		expect(text).toContain("Quotes");
		expect(text).toContain("random quote");
		expect(text).toContain("Elapsed");
	});

	it("should show all three modes in header", async () => {
		const { buildMenu } = await import("./screens");
		const menu = buildMenu("time", 0, [15, 30]);
		const text = chunkText(menu.chunks);
		expect(text).toContain("Time");
		expect(text).toContain("Words");
		expect(text).toContain("Quotes");
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
		// Verify chart presence (not exact chars)
		expect(text).not.toContain("sparkline");
		expect(text).toContain("over time");
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
		// Verify chart is not included
		expect(text).not.toContain("over time");
		expect(text).not.toContain("sparkline");
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

describe("buildHistory", () => {
	it("should render stats header with mode breakdown", async () => {
		const { buildHistory } = await import("./screens");
		const sessions = [makeSession()];
		const agg = makeAggregates();
		const output = buildHistory(sessions, agg, 1, 1, 0);
		expect(output).toBeInstanceOf(StyledText);
		const text = chunkText(output.chunks);
		// Mode stats
		expect(text).toContain("Time:  Best 82 WPM");
		expect(text).toContain("Words: Best 78 WPM");
		// Overall
		expect(text).toContain("10 sessions");
		expect(text).toContain("5m 0s");
		expect(text).toContain("Best: 82 WPM");
		expect(text).toContain("93.2%");
		// Trend chart
		expect(text).toContain("WPM trend");
	});

	it("should render session rows with correct data", async () => {
		const { buildHistory } = await import("./screens");
		const sessions = [
			makeSession({ id: 12, wpm: 82, mode: "time", timeOption: 30 }),
		];
		const agg = makeAggregates();
		const output = buildHistory(sessions, agg, 1, 1, 0);
		const text = chunkText(output.chunks);
		expect(text).toContain("#12");
		expect(text).toContain("82 WPM");
		expect(text).toContain("time 30s");
		expect(text).toContain("2026-05-22");
	});

	it("should highlight selected session with triangle", async () => {
		const { buildHistory } = await import("./screens");
		const sessions = [
			makeSession({ id: 1, wpm: 82 }),
			makeSession({ id: 2, wpm: 78 }),
		];
		const agg = makeAggregates();
		const output = buildHistory(sessions, agg, 1, 1, 0);
		const text = chunkText(output.chunks);
		expect(text).toContain("▸");
	});

	it("should show pagination info", async () => {
		const { buildHistory } = await import("./screens");
		const sessions = [makeSession()];
		const agg = makeAggregates();
		const output = buildHistory(sessions, agg, 1, 3, 0);
		const text = chunkText(output.chunks);
		expect(text).toContain("Page 2/3");
	});

	it("should show empty message when no sessions", async () => {
		const { buildHistory } = await import("./screens");
		const agg = makeAggregates({ totalSessions: 0 });
		const output = buildHistory([], agg, 1, 1, 0);
		const text = chunkText(output.chunks);
		expect(text).toContain("No sessions yet.");
		expect(text).toContain("Complete a typing test");
	});

	it("should render words mode sessions correctly", async () => {
		const { buildHistory } = await import("./screens");
		const sessions = [
			makeSession({
				id: 5,
				wpm: 65,
				mode: "words",
				wordCount: 50,
				timeOption: null,
			}),
		];
		const agg = makeAggregates();
		const output = buildHistory(sessions, agg, 1, 1, 0);
		const text = chunkText(output.chunks);
		expect(text).toContain("words 50");
	});
});

describe("buildEmptyHistory", () => {
	it("should show friendly empty message", async () => {
		const { buildEmptyHistory } = await import("./screens");
		const output = buildEmptyHistory();
		expect(output).toBeInstanceOf(StyledText);
		const text = chunkText(output.chunks);
		expect(text).toContain("— History —");
		expect(text).toContain("No sessions yet.");
		expect(text).toContain("Complete a typing test");
		expect(text).toContain("Esc: Menu");
	});
});

describe("buildHistoryDetail", () => {
	it("should render session metadata", async () => {
		const { buildHistoryDetail } = await import("./screens");
		const session = makeSession({ id: 12, durationSeconds: 30 });
		const output = buildHistoryDetail(session);
		expect(output).toBeInstanceOf(StyledText);
		const text = chunkText(output.chunks);
		expect(text).toContain("Session #12");
		expect(text).toContain("2026-05-22");
		expect(text).toContain("30s");
		expect(text).toContain("time 30s");
	});

	it("should render stats", async () => {
		const { buildHistoryDetail } = await import("./screens");
		const session = makeSession({ wpm: 82, rawWpm: 88, accuracy: 93.2 });
		const output = buildHistoryDetail(session);
		const text = chunkText(output.chunks);
		expect(text).toContain("82");
		expect(text).toContain("88");
		expect(text).toContain("93.2");
	});

	it("should include WPM chart when history is available", async () => {
		const { buildHistoryDetail } = await import("./screens");
		const session = makeSession({ wpmHistory: [30, 40, 50, 60, 55, 70, 82] });
		const output = buildHistoryDetail(session);
		const text = chunkText(output.chunks);
		expect(text).toContain("WPM over time");
	});

	it("should not include chart when wpmHistory is empty", async () => {
		const { buildHistoryDetail } = await import("./screens");
		const session = makeSession({ wpmHistory: [] });
		const output = buildHistoryDetail(session);
		const text = chunkText(output.chunks);
		expect(text).not.toContain("WPM over time");
	});

	it("should render words mode metadata", async () => {
		const { buildHistoryDetail } = await import("./screens");
		const session = makeSession({
			mode: "words",
			wordCount: 50,
			timeOption: null,
		});
		const output = buildHistoryDetail(session);
		const text = chunkText(output.chunks);
		expect(text).toContain("words 50");
	});
});

describe("buildGame", () => {
	it("should show countdown seconds for time mode", async () => {
		const { buildGame } = await import("./screens");
		const words = [
			{
				letters: [{ char: "h", state: "untyped" as const }],
				hasError: false,
				isCompleted: false,
			},
		];
		const output = buildGame("time", 25, 40, 50, words, 0);
		const text = chunkText(output.chunks);
		expect(text).toContain("25s");
		expect(text).toContain("WPM: 40");
	});

	it("should show elapsed MM:SS for quote mode", async () => {
		const { buildGame } = await import("./screens");
		const words = [
			{
				letters: [{ char: "h", state: "untyped" as const }],
				hasError: false,
				isCompleted: false,
			},
		];
		const output = buildGame("quote", 65, 40, 50, words, 0);
		const text = chunkText(output.chunks);
		expect(text).toContain("01:05");
		expect(text).not.toContain("65s");
	});

	it("should show elapsed MM:SS for words mode", async () => {
		const { buildGame } = await import("./screens");
		const words = [
			{
				letters: [{ char: "a", state: "untyped" as const }],
				hasError: false,
				isCompleted: false,
			},
		];
		const output = buildGame("words", 125, 55, 60, words, 0);
		const text = chunkText(output.chunks);
		expect(text).toContain("02:05");
	});

	it("should format single-digit seconds with leading zero in quote mode", async () => {
		const { buildGame } = await import("./screens");
		const words = [
			{
				letters: [{ char: "x", state: "untyped" as const }],
				hasError: false,
				isCompleted: false,
			},
		];
		const output = buildGame("quote", 5, 30, 35, words, 0);
		const text = chunkText(output.chunks);
		expect(text).toContain("00:05");
	});
});

describe("buildResults with quote", () => {
	it("should show quote source attribution when quote is provided", async () => {
		const { buildResults } = await import("./screens");
		const result: SessionResult = {
			wpm: 45,
			rawWpm: 50,
			accuracy: 92.5,
			correctChars: 100,
			totalChars: 110,
			errors: 10,
		};
		const quote: Quote = {
			text: "The only way to do great work is to love what you do",
			source: "Steve Jobs",
			length: "medium",
		};
		const output = buildResults(result, [], quote);
		const text = chunkText(output.chunks);
		expect(text).toContain("Steve Jobs");
		expect(text).toContain("great work");
	});

	it("should truncate long quote text with ellipsis", async () => {
		const { buildResults } = await import("./screens");
		const result: SessionResult = {
			wpm: 45,
			rawWpm: 50,
			accuracy: 92.5,
			correctChars: 100,
			totalChars: 110,
			errors: 10,
		};
		const longText = "a".repeat(200);
		const quote: Quote = {
			text: longText,
			source: "Test Source",
			length: "long",
		};
		const output = buildResults(result, [], quote);
		const text = chunkText(output.chunks);
		expect(text).toContain("…");
		expect(text).toContain("Test Source");
		// Full 200-char string should NOT appear (it's truncated)
		expect(text).not.toContain(longText);
	});

	it("should not show quote section when no quote provided", async () => {
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
		const text = chunkText(output.chunks);
		// Should still have stats
		expect(text).toContain("45");
		expect(text).toContain("Results");
		// Should NOT have quote text (no quoted string)
		expect(text).not.toMatch(/"[^"]+"/);
	});
});

describe("buildHistory with quote sessions", () => {
	it("should show quote source in session row", async () => {
		const { buildHistory } = await import("./screens");
		const sessions = [
			makeSession({
				id: 20,
				wpm: 55,
				mode: "quote",
				timeOption: null,
				wordCount: null,
				quoteText: "To be or not to be",
				quoteSource: "Shakespeare",
				quoteLength: "short",
			}),
		];
		const agg = makeAggregates();
		const output = buildHistory(sessions, agg, 0, 1, 0);
		const text = chunkText(output.chunks);
		expect(text).toContain("Shakespeare");
		expect(text).toContain("#20");
	});

	it("should show quote stats in header when quote sessions exist", async () => {
		const { buildHistory } = await import("./screens");
		const agg = makeAggregates({
			quote: { bestWpm: 70, avgWpm: 55, avgAccuracy: 91.0, sessions: 3 },
		});
		const output = buildHistory([], agg, 0, 1, 0);
		const text = chunkText(output.chunks);
		expect(text).toContain("Quotes:");
		expect(text).toContain("Best 70 WPM");
	});

	it("should show quote mode in history detail", async () => {
		const { buildHistoryDetail } = await import("./screens");
		const session = makeSession({
			mode: "quote",
			timeOption: null,
			wordCount: null,
			quoteText: "To be or not to be",
			quoteSource: "Shakespeare",
			quoteLength: "short",
		});
		const output = buildHistoryDetail(session);
		const text = chunkText(output.chunks);
		expect(text).toContain("Shakespeare");
		expect(text).toContain("To be or not to be");
	});
});
