import type { Letter, Word } from "./lib/types";
import wordlist from "./data/wordlists/english.json";
import { StyledText, stringToStyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";

export interface SessionResult {
	wpm: number;
	rawWpm: number;
	accuracy: number;
	correctChars: number;
	totalChars: number;
	errors: number;
}

/** Color for correct letters — green */
const CORRECT_FG = "#98c379";
/** Color for incorrect letters — red */
const INCORRECT_FG = "#e06c75";
/** Color for extra characters — red-tinted */
const EXTRA_FG = "#e06c75";
/** Color for selected menu option — bright */
const SELECTED_FG = "#e5c07b";
/** Color for header text — muted */
const HEADER_FG = "#5c6370";

function colored(text: string, color: string): TextChunk {
	return { text, fg: color } as unknown as TextChunk;
}

export function wordText(word: {
	letters: Letter[];
	isCompleted: boolean;
}): TextChunk[] {
	const chunks: TextChunk[] = [];
	for (const letter of word.letters) {
		switch (letter.state) {
			case "correct":
				chunks.push(colored(letter.char, CORRECT_FG));
				break;
			case "incorrect":
				chunks.push(colored(letter.char, INCORRECT_FG));
				break;
			case "extra":
				chunks.push(colored(letter.char, EXTRA_FG));
				break;
			default:
				chunks.push({ text: letter.char } as TextChunk);
				break;
		}
	}
	if (!word.isCompleted) {
		chunks.push({ text: " " } as TextChunk);
	}
	return chunks;
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

export function buildMenu(
	selectedTimeIndex: number,
	timeOptions: number[],
): StyledText {
	const chunks: TextChunk[] = [];

	// Title
	chunks.push(colored(`Monkeyterm v${VERSION}\n\n`, HEADER_FG));
	chunks.push(...stringToStyledText("Select time and Press Enter to start\n\n").chunks);

	// Options
	for (let i = 0; i < timeOptions.length; i++) {
		const sel = i === selectedTimeIndex;
		if (sel) {
			chunks.push(colored(`▸ ${timeOptions[i]}s\n`, SELECTED_FG));
		} else {
			chunks.push(...stringToStyledText(`  ${timeOptions[i]}s\n`).chunks);
		}
	}

	// Hints
	chunks.push(...stringToStyledText("\n↑↓ Navigate · Enter Start · Ctrl+C Quit").chunks);

	return new StyledText(chunks);
}

export function buildGame(
	remainingSeconds: number,
	liveWpm: number,
	liveRawWpm: number,
	words: Word[],
	currentWordIndex: number,
): StyledText {
	const chunks: TextChunk[] = [];

	// Header — muted color
	chunks.push(colored(`⏱ ${remainingSeconds}s    WPM: ${liveWpm}  RAW: ${liveRawWpm}\n\n`, HEADER_FG));

	// Words — only show 3 lines around current position
	const start = Math.max(0, currentWordIndex - 1);
	const end = Math.min(words.length, start + 3);

	for (let i = start; i < end; i++) {
		const word = words[i];
		if (word) {
			const wordChunks = wordText(word);
			chunks.push(...wordChunks);
			chunks.push({ text: "\n" } as TextChunk);
		}
	}

	// Footer
	chunks.push(colored("\nEsc: Menu · Ctrl+C: Quit", HEADER_FG));

	return new StyledText(chunks);
}

export function buildResults(result: SessionResult): StyledText {
	const chunks: TextChunk[] = [];

	chunks.push(colored("— Results —\n\n", SELECTED_FG));
	chunks.push(...stringToStyledText(
		`WPM:        ${result.wpm}\n` +
		`Raw WPM:    ${result.rawWpm}\n` +
		`Accuracy:   ${result.accuracy}%\n` +
		`Chars:      ${result.correctChars} / ${result.totalChars}\n` +
		`Errors:     ${result.errors}\n\n` +
		"Tab: Restart · Esc: Menu · Ctrl+C: Quit"
	).chunks);

	return new StyledText(chunks);
}
