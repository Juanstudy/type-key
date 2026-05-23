import { describe, it, expect, beforeEach } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";

// Use a temp directory for the test database to avoid touching real data.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "type-key-db-test-"));

process.env.XDG_DATA_HOME = tmpDir;

// Now import after env is set
const dbModule = await import("./db");
const {
	initDB,
	saveSession,
	getSessions,
	getSession,
	getAggregates,
	serializeHistory,
	parseHistory,
	getDB,
} = dbModule;

// Helper to create a valid session
function has<K extends string>(
	obj: Record<string, unknown>,
	key: K,
): obj is Record<string, unknown> & Record<K, unknown> {
	return key in obj;
}

function makeSession(overrides: Record<string, unknown> = {}) {
	return {
		timestamp: has(overrides, "timestamp")
			? (overrides.timestamp as string)
			: new Date().toISOString(),
		mode: has(overrides, "mode")
			? (overrides.mode as "time" | "words")
			: "time",
		timeOption: has(overrides, "timeOption")
			? (overrides.timeOption as number | null)
			: 30,
		wordCount: has(overrides, "wordCount")
			? (overrides.wordCount as number | null)
			: null,
		wpm: has(overrides, "wpm") ? (overrides.wpm as number) : 50,
		rawWpm: has(overrides, "rawWpm") ? (overrides.rawWpm as number) : 55,
		accuracy: has(overrides, "accuracy")
			? (overrides.accuracy as number)
			: 92.5,
		correctChars: has(overrides, "correctChars")
			? (overrides.correctChars as number)
			: 100,
		totalChars: has(overrides, "totalChars")
			? (overrides.totalChars as number)
			: 110,
		errors: has(overrides, "errors") ? (overrides.errors as number) : 10,
		durationSeconds: has(overrides, "durationSeconds")
			? (overrides.durationSeconds as number)
			: 30,
		wpmHistory: has(overrides, "wpmHistory")
			? (overrides.wpmHistory as number[])
			: [30, 40, 50, 45, 55],
	};
}

beforeEach(() => {
	// Re-init the database for each test (clear and recreate)
	const database = getDB();
	database.run("DROP TABLE IF EXISTS sessions");
	initDB();
});

describe("initDB", () => {
	it("should create the sessions table", () => {
		const database = getDB();
		const rows = database
			.query(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'",
			)
			.all() as { name: string }[];
		expect(rows.length).toBe(1);
		expect(rows[0]?.name).toBe("sessions");
	});

	it("should be idempotent", () => {
		// Should not throw when called twice
		initDB();
		initDB();
		const database = getDB();
		const rows = database
			.query(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'",
			)
			.all() as { name: string }[];
		expect(rows.length).toBe(1);
	});
});

describe("saveSession", () => {
	it("should save a session and return its id", () => {
		const id = saveSession(makeSession());
		expect(id).toBeGreaterThan(0);
	});

	it("should increment id on subsequent saves", () => {
		const id1 = saveSession(makeSession());
		const id2 = saveSession(makeSession());
		expect(id2).toBe(id1 + 1);
	});

	it("should store all fields correctly", () => {
		const data = makeSession({
			timestamp: "2026-05-22T12:00:00.000Z",
			mode: "words",
			timeOption: null,
			wordCount: 50,
			wpm: 75,
			rawWpm: 80,
			accuracy: 93.8,
			correctChars: 200,
			totalChars: 215,
			errors: 15,
			durationSeconds: 60,
			wpmHistory: [40, 55, 70, 75],
		});
		const id = saveSession(data);
		const saved = getSession(id);

		expect(saved).not.toBeNull();
		expect(saved!.id).toBe(id);
		expect(saved!.timestamp).toBe("2026-05-22T12:00:00.000Z");
		expect(saved!.mode).toBe("words");
		expect(saved!.wordCount).toBe(50);
		expect(saved!.timeOption).toBeNull();
		expect(saved!.wpm).toBe(75);
		expect(saved!.rawWpm).toBe(80);
		expect(saved!.accuracy).toBe(93.8);
		expect(saved!.correctChars).toBe(200);
		expect(saved!.totalChars).toBe(215);
		expect(saved!.errors).toBe(15);
		expect(saved!.durationSeconds).toBe(60);
		expect(saved!.wpmHistory).toEqual([40, 55, 70, 75]);
	});
});

describe("getSession", () => {
	it("should return null for non-existent id", () => {
		const session = getSession(999);
		expect(session).toBeNull();
	});

	it("should retrieve a saved session by id", () => {
		const id = saveSession(makeSession());
		const session = getSession(id);
		expect(session).not.toBeNull();
		expect(session!.id).toBe(id);
	});
});

describe("getSessions", () => {
	it("should return empty array when no sessions exist", () => {
		const sessions = getSessions();
		expect(sessions).toEqual([]);
	});

	it("should return sessions ordered by timestamp DESC", () => {
		const t1 = "2026-05-22T10:00:00.000Z";
		const t2 = "2026-05-22T11:00:00.000Z";
		const t3 = "2026-05-22T12:00:00.000Z";

		saveSession(makeSession({ timestamp: t1 }));
		saveSession(makeSession({ timestamp: t2 }));
		saveSession(makeSession({ timestamp: t3 }));

		const sessions = getSessions(10, 0);
		expect(sessions.length).toBe(3);
		expect(sessions[0]!.timestamp).toBe(t3);
		expect(sessions[1]!.timestamp).toBe(t2);
		expect(sessions[2]!.timestamp).toBe(t1);
	});

	it("should paginate results (limit 10, offset 0 returns first 10 of 15)", () => {
		for (let i = 0; i < 15; i++) {
			saveSession(
				makeSession({
					timestamp: `2026-05-22T${String(i).padStart(2, "0")}:00:00.000Z`,
				}),
			);
		}

		const page1 = getSessions(10, 0);
		expect(page1.length).toBe(10);

		const page2 = getSessions(10, 10);
		expect(page2.length).toBe(5);
	});

	it("should use default limit of 10", () => {
		for (let i = 0; i < 15; i++) {
			saveSession(
				makeSession({
					timestamp: `2026-05-22T${String(i).padStart(2, "0")}:00:00.000Z`,
				}),
			);
		}

		const sessions = getSessions();
		expect(sessions.length).toBe(10);
	});

	it("should use default offset of 0", () => {
		saveSession(makeSession());
		const sessions = getSessions();
		expect(sessions.length).toBe(1);
	});
});

describe("getAggregates", () => {
	it("should return zeros when no sessions exist", () => {
		const agg = getAggregates();
		expect(agg.bestWpm).toBe(0);
		expect(agg.bestAccuracy).toBe(0);
		expect(agg.avgWpm).toBe(0);
		expect(agg.avgRawWpm).toBe(0);
		expect(agg.avgAccuracy).toBe(0);
		expect(agg.avgDuration).toBe(0);
		expect(agg.avgErrors).toBe(0);
		expect(agg.totalSessions).toBe(0);
		expect(agg.totalTimeSeconds).toBe(0);
	});

	it("should return correct stats across all sessions", () => {
		// 3 sessions with known values
		saveSession(
			makeSession({ wpm: 50, rawWpm: 55, accuracy: 90, durationSeconds: 30, errors: 5 }),
		);
		saveSession(
			makeSession({ wpm: 80, rawWpm: 85, accuracy: 95, durationSeconds: 60, errors: 3 }),
		);
		saveSession(
			makeSession({ wpm: 65, rawWpm: 70, accuracy: 92.5, durationSeconds: 45, errors: 7 }),
		);

		const agg = getAggregates();

		// Best
		expect(agg.bestWpm).toBe(80);
		expect(agg.bestAccuracy).toBe(95);

		// Averages over all 3
		// WPM: (50+80+65)/3 = 65
		// Raw: (55+85+70)/3 = 70
		// Acc: (90+95+92.5)/3 = 92.5
		// Dur: (30+60+45)/3 = 45
		// Err: (5+3+7)/3 = 5
		expect(agg.avgWpm).toBe(65);
		expect(agg.avgRawWpm).toBe(70);
		expect(agg.avgAccuracy).toBe(92.5);
		expect(agg.avgDuration).toBe(45);
		expect(agg.avgErrors).toBe(5);

		// Count + total time
		expect(agg.totalSessions).toBe(3);
		expect(agg.totalTimeSeconds).toBe(135); // 30+60+45
	});

	it("should handle rounding correctly", () => {
		saveSession(makeSession({ wpm: 33, rawWpm: 37, accuracy: 91.7, durationSeconds: 27, errors: 4 }));
		saveSession(makeSession({ wpm: 47, rawWpm: 51, accuracy: 94.2, durationSeconds: 42, errors: 6 }));

		const agg = getAggregates();
		// WPM: (33+47)/2 = 40
		// Raw: (37+51)/2 = 44
		// Acc: (91.7+94.2)/2 = 92.95 → 93
		// Dur: (27+42)/2 = 34.5
		// Err: (4+6)/2 = 5
		expect(agg.avgWpm).toBe(40);
		expect(agg.avgRawWpm).toBe(44);
		expect(agg.avgAccuracy).toBe(93);
		expect(agg.avgDuration).toBe(34.5);
		expect(agg.avgErrors).toBe(5);
	});
});

describe("serializeHistory / parseHistory", () => {
	it("should roundtrip an array", () => {
		const arr = [10, 20, 30, 40, 50];
		const json = serializeHistory(arr);
		const back = parseHistory(json);
		expect(back).toEqual(arr);
	});

	it("should parse stored JSON", () => {
		const arr = [30, 40, 45, 55, 60];
		const id = saveSession(makeSession({ wpmHistory: arr }));
		const session = getSession(id);
		expect(session!.wpmHistory).toEqual(arr);
	});

	it("should return empty array for invalid JSON", () => {
		expect(parseHistory("not-json")).toEqual([]);
	});

	it("should return empty array for non-array JSON", () => {
		expect(parseHistory('{"a": 1}')).toEqual([]);
	});

	it("should return empty array for array with non-numbers", () => {
		expect(parseHistory('[1, "two", 3]')).toEqual([]);
	});
});

describe("words mode session", () => {
	it("should save with wordCount set and timeOption null", () => {
		const data = makeSession({
			mode: "words",
			timeOption: null,
			wordCount: 25,
		});
		const id = saveSession(data);
		const session = getSession(id);
		expect(session!.mode).toBe("words");
		expect(session!.timeOption).toBeNull();
		expect(session!.wordCount).toBe(25);
	});
});
