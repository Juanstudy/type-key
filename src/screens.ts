import type { Letter, Word } from "./lib/types";
import wordlist from "./data/wordlists/english.json";

export interface SessionResult {
	wpm: number;
	rawWpm: number;
	accuracy: number;
	correctChars: number;
	totalChars: number;
	errors: number;
}

export function wordText(word: { letters: Letter[]; isCompleted: boolean }): string {
	return (
		word.letters.map((l) => l.char).join("") + (word.isCompleted ? "" : " ")
	);
}

export function shuffleWords(count: number): string[] {
	const a = [...wordlist];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const vi = a[i] as string;
		const vj = a[j] as string;
		a[i] = vj;
		a[j] = vi;
	}
	return a.slice(0, count);
}

export const VERSION = "1.0.0";

export function buildMenu(selectedTimeIndex: number, timeOptions: number[]): string {
	let s = `Monkeyterm v${VERSION}\n\n`;
	s += "Select time and press Enter to start\n\n";
	for (let i = 0; i < timeOptions.length; i++) {
		const sel = i === selectedTimeIndex;
		s += `${sel ? "▸ " : "  "}${timeOptions[i]}s\n`;
	}
	s += "\n↑↓ Navigate · Enter Start · Ctrl+C Quit";
	return s;
}

export function buildGame(
	remainingSeconds: number,
	liveWpm: number,
	liveRawWpm: number,
	words: Word[],
	currentWordIndex: number,
): string {
	let s = `⏱ ${remainingSeconds}s    WPM: ${liveWpm}  RAW: ${liveRawWpm}\n\n`;

	const start = Math.max(0, currentWordIndex - 1);
	const end = Math.min(words.length, start + 3);

	for (let i = start; i < end; i++) {
		const word = words[i];
		if (word) s += wordText(word) + "\n";
	}

	s += "\nEsc: Menu · Ctrl+C: Quit";
	return s;
}

export function buildResults(result: SessionResult): string {
	return [
		"— Results —",
		"",
		`WPM:        ${result.wpm}`,
		`Raw WPM:    ${result.rawWpm}`,
		`Accuracy:   ${result.accuracy}%`,
		`Chars:      ${result.correctChars} / ${result.totalChars}`,
		`Errors:     ${result.errors}`,
		"",
		"Tab: Restart · Esc: Menu · Ctrl+C: Quit",
	].join("\n");
}
