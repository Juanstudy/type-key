/** Estado de cada letra individual */
/** Possible states for each typed character */
export type LetterState = "untyped" | "correct" | "incorrect" | "extra";

export interface Letter {
	char: string;
	state: LetterState;
}

export interface Word {
	letters: Letter[];
	hasError: boolean;
	isCompleted: boolean;
}

export type GameMode = "time" | "words" | "quote";
export type TimeOption = 15 | 30 | 60 | 120;
export type WordCountOption = 10 | 25 | 50 | 100;
export type Language = "english" | "spanish";

export interface GameConfig {
	mode: GameMode;
	time?: TimeOption;
	wordCount?: WordCountOption;
	language: Language;
}

export interface StoredSession {
	id: number;
	timestamp: string;
	mode: "time" | "words";
	timeOption: number | null;
	wordCount: number | null;
	wpm: number;
	rawWpm: number;
	accuracy: number;
	correctChars: number;
	totalChars: number;
	errors: number;
	durationSeconds: number;
	wpmHistory: number[];
}

export type NewSession = Omit<StoredSession, "id">;

export interface ModeStats {
	bestWpm: number;
	avgWpm: number;
	avgAccuracy: number;
	sessions: number;
}

export interface SessionAggregates {
	bestWpm: number;
	bestAccuracy: number;
	avgWpm: number;
	avgRawWpm: number;
	avgAccuracy: number;
	avgDuration: number;
	avgErrors: number;
	totalSessions: number;
	totalTimeSeconds: number;
	time: ModeStats;
	words: ModeStats;
	recentWpms: number[];
}

export type ScreenName =
	| "menu"
	| "game"
	| "results"
	| "history"
	| "history-detail";
