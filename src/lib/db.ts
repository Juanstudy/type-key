import { Database } from "bun:sqlite";
import fs from "fs";
import path from "path";
import os from "os";
import type { NewSession, SessionAggregates, StoredSession } from "./types";

let db: Database | null = null;

/**
 * Resolve the database file path under XDG data directory.
 */
function getDbPath(): string {
	const dataDir =
		process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share");
	const appDir = path.join(dataDir, "type-key");
	if (!fs.existsSync(appDir)) {
		fs.mkdirSync(appDir, { recursive: true });
	}
	return path.join(appDir, "type-key.db");
}

/**
 * Get the singleton database connection.
 */
export function getDB(): Database {
	if (!db) {
		db = new Database(getDbPath());
	}
	return db;
}

/**
 * Initialize the database schema.
 * Idempotent — safe to call multiple times.
 */
export function initDB(): void {
	const database = getDB();
	database.run(`
		CREATE TABLE IF NOT EXISTS sessions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			timestamp TEXT NOT NULL,
			mode TEXT NOT NULL CHECK(mode IN ('time', 'words')),
			time_option INTEGER,
			word_count INTEGER,
			wpm REAL NOT NULL,
			raw_wpm REAL NOT NULL,
			accuracy REAL NOT NULL,
			correct_chars INTEGER NOT NULL,
			total_chars INTEGER NOT NULL,
			errors INTEGER NOT NULL,
			duration_seconds INTEGER NOT NULL,
			wpm_history TEXT DEFAULT '[]'
		)
	`);
	database.run(`
		CREATE INDEX IF NOT EXISTS idx_sessions_ts ON sessions(timestamp DESC)
	`);
}

export function serializeHistory(arr: number[]): string {
	return JSON.stringify(arr);
}

export function parseHistory(str: string): number[] {
	try {
		const parsed = JSON.parse(str);
		if (Array.isArray(parsed) && parsed.every((n) => typeof n === "number")) {
			return parsed;
		}
		return [];
	} catch {
		return [];
	}
}

function rowToSession(row: Record<string, unknown>): StoredSession {
	return {
		id: row.id as number,
		timestamp: row.timestamp as string,
		mode: row.mode as "time" | "words",
		timeOption: (row.time_option as number | null) ?? null,
		wordCount: (row.word_count as number | null) ?? null,
		wpm: row.wpm as number,
		rawWpm: row.raw_wpm as number,
		accuracy: row.accuracy as number,
		correctChars: row.correct_chars as number,
		totalChars: row.total_chars as number,
		errors: row.errors as number,
		durationSeconds: row.duration_seconds as number,
		wpmHistory: parseHistory(row.wpm_history as string),
	};
}

/**
 * Save a new session to the database.
 * Returns the inserted row id.
 */
export function saveSession(data: NewSession): number {
	const database = getDB();
	const query = database.query(`
		INSERT INTO sessions (timestamp, mode, time_option, word_count, wpm, raw_wpm, accuracy, correct_chars, total_chars, errors, duration_seconds, wpm_history)
		VALUES ($timestamp, $mode, $timeOption, $wordCount, $wpm, $rawWpm, $accuracy, $correctChars, $totalChars, $errors, $durationSeconds, $wpmHistory)
	`);
	const result = query.run({
		$timestamp: data.timestamp,
		$mode: data.mode,
		$timeOption: data.timeOption ?? null,
		$wordCount: data.wordCount ?? null,
		$wpm: data.wpm,
		$rawWpm: data.rawWpm,
		$accuracy: data.accuracy,
		$correctChars: data.correctChars,
		$totalChars: data.totalChars,
		$errors: data.errors,
		$durationSeconds: data.durationSeconds,
		$wpmHistory: serializeHistory(data.wpmHistory),
	}) as { lastInsertRowid: number };
	return Number(result.lastInsertRowid);
}

/**
 * Retrieve sessions with pagination, newest first.
 * Default limit: 10, default offset: 0.
 */
export function getSessions(
	limit: number = 10,
	offset: number = 0,
): StoredSession[] {
	const database = getDB();
	const query = database.query(`
		SELECT * FROM sessions ORDER BY timestamp DESC LIMIT $limit OFFSET $offset
	`);
	const rows = query.all({ $limit: limit, $offset: offset }) as Record<
		string,
		unknown
	>[];
	return rows.map(rowToSession);
}

/**
 * Retrieve a single session by id.
 * Returns null if not found.
 */
export function getSession(id: number): StoredSession | null {
	const database = getDB();
	const query = database.query(`SELECT * FROM sessions WHERE id = $id`);
	const row = query.get({ $id: id }) as Record<string, unknown> | null;
	if (!row) return null;
	return rowToSession(row);
}

function modeAggQuery(
	database: Database,
	mode: string,
): { bestWpm: number; avgWpm: number; avgAccuracy: number; count: number } {
	const row = database
		.query(
			`SELECT
				COALESCE(MAX(wpm), 0) as bestWpm,
				COALESCE(AVG(wpm), 0) as avgWpm,
				COALESCE(AVG(accuracy), 0) as avgAccuracy,
				COUNT(*) as count
			FROM sessions WHERE mode = $mode`,
		)
		.get({ $mode: mode }) as {
		bestWpm: number;
		avgWpm: number;
		avgAccuracy: number;
		count: number;
	};
	return {
		bestWpm: Math.round(row.bestWpm),
		avgWpm: Math.round(row.avgWpm * 10) / 10,
		avgAccuracy: Math.round(row.avgAccuracy * 10) / 10,
		count: row.count,
	};
}

/**
 * Retrieve aggregate statistics across all sessions.
 */
export function getAggregates(): SessionAggregates {
	const database = getDB();

	const row = database
		.query(`
			SELECT
				COALESCE(MAX(wpm), 0) as bestWpm,
				COALESCE(MAX(accuracy), 0) as bestAccuracy,
				COALESCE(AVG(wpm), 0) as avgWpm,
				COALESCE(AVG(raw_wpm), 0) as avgRawWpm,
				COALESCE(AVG(accuracy), 0) as avgAccuracy,
				COALESCE(AVG(duration_seconds), 0) as avgDuration,
				COALESCE(AVG(errors), 0) as avgErrors,
				COUNT(*) as totalSessions,
				COALESCE(SUM(duration_seconds), 0) as totalTimeSeconds
			FROM sessions
		`)
		.get() as {
		bestWpm: number;
		bestAccuracy: number;
		avgWpm: number;
		avgRawWpm: number;
		avgAccuracy: number;
		avgDuration: number;
		avgErrors: number;
		totalSessions: number;
		totalTimeSeconds: number;
	};

	const timeStats = modeAggQuery(database, "time");
	const wordsStats = modeAggQuery(database, "words");

	// Last 15 sessions' WPMs for trend chart
	const recentRows = database
		.query(`SELECT wpm FROM sessions ORDER BY timestamp DESC LIMIT 15`)
		.all() as { wpm: number }[];
	// Reverse so chart shows oldest → newest (left → right)
	const recentWpms = recentRows.map((r) => r.wpm).reverse();

	return {
		bestWpm: Math.round(row.bestWpm),
		bestAccuracy: Math.round(row.bestAccuracy * 10) / 10,
		avgWpm: Math.round(row.avgWpm * 10) / 10,
		avgRawWpm: Math.round(row.avgRawWpm * 10) / 10,
		avgAccuracy: Math.round(row.avgAccuracy * 10) / 10,
		avgDuration: Math.round(row.avgDuration * 10) / 10,
		avgErrors: Math.round(row.avgErrors * 10) / 10,
		totalSessions: row.totalSessions,
		totalTimeSeconds: row.totalTimeSeconds,
		time: {
			bestWpm: timeStats.bestWpm,
			avgWpm: timeStats.avgWpm,
			avgAccuracy: timeStats.avgAccuracy,
			sessions: timeStats.count,
		},
		words: {
			bestWpm: wordsStats.bestWpm,
			avgWpm: wordsStats.avgWpm,
			avgAccuracy: wordsStats.avgAccuracy,
			sessions: wordsStats.count,
		},
		recentWpms,
	};
}
