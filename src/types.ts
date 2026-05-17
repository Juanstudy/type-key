/** Estado de cada letra individual */
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

export interface SessionResult {
	date: string;
	wpm: number;
	rawWpm: number;
	accuracy: number;
	mode: GameMode;
	duration?: number;
	wordCount?: number;
	language: string;
	chars: number;
	errors: number;
}

export type ScreenName = "menu" | "game" | "results" | "history";
