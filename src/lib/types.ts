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

// SessionResult is defined locally in index.ts — exported type removed until history screen is built

export type ScreenName = "menu" | "game" | "results";
