import type {
	Letter,
	Word,
	StoredSession,
	SessionAggregates,
} from "./lib/types";
import wordlist from "./data/wordlists/english.json";
import { StyledText, stringToStyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import { plot } from "@crafter/charts";

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

const MODE_LABELS = { time: "Time", words: "Words" } as const;

export function buildMenu(
	mode: "time" | "words",
	selectedIndex: number,
	options: number[],
): StyledText {
	const chunks: TextChunk[] = [];

	// Title
	chunks.push(colored(`Monkeyterm v${VERSION}\n\n`, HEADER_FG));

	// Mode header
	const otherMode = mode === "time" ? "Words" : "Time";
	chunks.push(colored(`${MODE_LABELS[mode]}`, SELECTED_FG));
	chunks.push(...stringToStyledText(`  ·  ${otherMode}\n\n`).chunks);

	// Options
	const suffix = mode === "time" ? "s" : " words";
	for (let i = 0; i < options.length; i++) {
		const sel = i === selectedIndex;
		if (sel) {
			chunks.push(colored(`▸ ${options[i]}${suffix}\n`, SELECTED_FG));
		} else {
			chunks.push(...stringToStyledText(`  ${options[i]}${suffix}\n`).chunks);
		}
	}

	// Hints
	chunks.push(
		...stringToStyledText(
			"\n← → Mode · ↑↓ Option · Enter Start · H History · Ctrl+C Quit",
		).chunks,
	);

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
	chunks.push(
		colored(
			`⏱ ${remainingSeconds}s    WPM: ${liveWpm}  RAW: ${liveRawWpm}\n\n`,
			HEADER_FG,
		),
	);

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

/**
 * Downsample an array to at most `maxPoints` by taking evenly spaced samples.
 */
function downsample(data: number[], maxPoints: number): number[] {
	if (data.length <= maxPoints) return [...data];
	const step = (data.length - 1) / (maxPoints - 1);
	const result: number[] = [];
	for (let i = 0; i < maxPoints; i++) {
		const idx = Math.round(i * step);
		const val = data.at(idx);
		if (val !== undefined) result.push(val);
	}
	return result;
}

/**
 * Build a chart of WPM over time using @crafter/charts.
 * Returns empty string when there are fewer than 2 data points.
 */
function buildWpmChart(wpmHistory: number[], width?: number): string {
	if (wpmHistory.length < 2) return "";
	const downsampled = downsample(wpmHistory, 30);

	const chartOptions: { width?: number; min?: number; max?: number } = {};
	if (width !== undefined) chartOptions.width = width;

	return plot(downsampled, chartOptions);
}

function padCenter(s: string, width: number): string {
	const pad = Math.max(0, width - s.length);
	const left = Math.floor(pad / 2);
	const right = pad - left;
	return " ".repeat(left) + s + " ".repeat(right);
}

export function buildResults(
	result: SessionResult,
	wpmHistory: number[] = [],
): StyledText {
	const chartString = buildWpmChart(wpmHistory);
	const chartLines = chartString ? chartString.split("\n") : [];

	const lines: string[] = [
		"— Results —",
		"",
		`WPM:        ${result.wpm}`,
		`Raw WPM:    ${result.rawWpm}`,
		`Accuracy:   ${result.accuracy}%`,
		`Chars:      ${result.correctChars} / ${result.totalChars}`,
		`Errors:     ${result.errors}`,
	];

	if (chartLines.length > 1) {
		lines.push("");
		lines.push("WPM over time:");
		for (const chartLine of chartLines) {
			lines.push(chartLine);
		}
	}

	lines.push("");
	lines.push("Tab: Restart · Esc: Menu · Ctrl+C: Quit");

	const contentWidth = Math.max(...lines.map((l) => l.length), 20);

	const chunks: TextChunk[] = [];

	// Top border
	chunks.push(colored("┌" + "─".repeat(contentWidth + 2) + "┐\n", HEADER_FG));

	for (const line of lines) {
		const isTitle = line === lines[0];
		const isSpacer = line === "";
		const padded = " " + padCenter(line, contentWidth) + " ";
		if (isTitle) {
			chunks.push(colored("│", HEADER_FG));
			chunks.push(colored(padded, SELECTED_FG));
			chunks.push(colored("│\n", HEADER_FG));
		} else if (isSpacer) {
			chunks.push(
				colored("│" + " ".repeat(contentWidth + 2) + "│\n", HEADER_FG),
			);
		} else {
			chunks.push(colored("│", HEADER_FG));
			chunks.push(...stringToStyledText(padded).chunks);
			chunks.push(colored("│\n", HEADER_FG));
		}
	}

	// Bottom border
	chunks.push(colored("└" + "─".repeat(contentWidth + 2) + "┘", HEADER_FG));

	return new StyledText(chunks);
}

/** Format a session's mode and option as a short string like "time 30s" or "words 50" */
function formatModeOption(session: StoredSession): string {
	if (session.mode === "time" && session.timeOption !== null) {
		return `time ${session.timeOption}s`;
	}
	if (session.mode === "words" && session.wordCount !== null) {
		return `words ${session.wordCount}`;
	}
	return session.mode;
}

/** Format session date as YYYY-MM-DD */
function formatDate(iso: string): string {
	return iso.slice(0, 10);
}

/**
 * Build the history screen with stats header and paginated session list.
 */
export function buildHistory(
	sessions: StoredSession[],
	aggregates: SessionAggregates,
	page: number,
	totalPages: number,
	selectedIndex: number,
): StyledText {
	const lines: string[] = [];

	// Title
	lines.push("— History —");
	lines.push("");

	// Stats header — mode breakdown
	const totalMin = Math.floor(aggregates.totalTimeSeconds / 60);
	const totalSec = aggregates.totalTimeSeconds % 60;
	const totalTimeStr =
		totalMin > 0 ? `${totalMin}m ${totalSec}s` : `${totalSec}s`;

	// Time mode stats
	if (aggregates.time.sessions > 0) {
		lines.push(
			`Time:  Best ${aggregates.time.bestWpm} WPM  Avg ${aggregates.time.avgWpm} WPM  Acc ${aggregates.time.avgAccuracy}%  (${aggregates.time.sessions} sessions)`,
		);
	}
	// Words mode stats
	if (aggregates.words.sessions > 0) {
		lines.push(
			`Words: Best ${aggregates.words.bestWpm} WPM  Avg ${aggregates.words.avgWpm} WPM  Acc ${aggregates.words.avgAccuracy}%  (${aggregates.words.sessions} sessions)`,
		);
	}

	// Overall stats
	lines.push(
		`Overall: ${aggregates.totalSessions} sessions  ·  ${totalTimeStr}  ·  Best: ${aggregates.bestWpm} WPM  ·  Acc: ${aggregates.bestAccuracy}%`,
	);
	lines.push("");

	// WPM trend chart (last 15 sessions)
	if (aggregates.recentWpms.length >= 2) {
		const trend = buildWpmChart(aggregates.recentWpms);
		if (trend) {
			lines.push("WPM trend (last 15):");
			for (const chartLine of trend.split("\n")) {
				lines.push(chartLine);
			}
			lines.push("");
		}
	}

	// Session rows
	if (sessions.length === 0) {
		lines.push("No sessions yet.");
		lines.push("Complete a typing test to see");
		lines.push("your history here.");
	} else {
		for (let i = 0; i < sessions.length; i++) {
			const s = sessions[i]!;
			const prefix = i === selectedIndex ? "▸" : " ";
			const modeStr = formatModeOption(s);
			const dateStr = formatDate(s.timestamp);
			lines.push(
				`${prefix}#${s.id}  ${Math.round(s.wpm)} WPM  ${modeStr}  ${dateStr}`,
			);
		}
	}

	lines.push("");

	// Footer
	if (sessions.length > 0) {
		lines.push(`Page ${page}/${totalPages}   ↑↓ Navigate  Enter View`);
	}
	lines.push("Esc: Menu · Ctrl+C: Quit");

	const contentWidth = Math.max(...lines.map((l) => l.length), 20);
	const chunks: TextChunk[] = [];

	// Top border
	chunks.push(colored("┌" + "─".repeat(contentWidth + 2) + "┐\n", HEADER_FG));

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const isTitle = i === 0;
		const isSpacer = line === "";

		// Check if this is a session row that is selected
		const isSelectedRow =
			sessions.length > 0 && i >= 6 && i < 6 + sessions.length;
		const isActuallySelected = isSelectedRow && i - 6 === selectedIndex;

		const padded = " " + padCenter(line, contentWidth) + " ";
		if (isTitle) {
			chunks.push(colored("│", HEADER_FG));
			chunks.push(colored(padded, SELECTED_FG));
			chunks.push(colored("│\n", HEADER_FG));
		} else if (isSpacer) {
			chunks.push(
				colored("│" + " ".repeat(contentWidth + 2) + "│\n", HEADER_FG),
			);
		} else if (isActuallySelected) {
			chunks.push(colored("│", HEADER_FG));
			chunks.push(colored(padded, SELECTED_FG));
			chunks.push(colored("│\n", HEADER_FG));
		} else {
			chunks.push(colored("│", HEADER_FG));
			chunks.push(...stringToStyledText(padded).chunks);
			chunks.push(colored("│\n", HEADER_FG));
		}
	}

	// Bottom border
	chunks.push(colored("└" + "─".repeat(contentWidth + 2) + "┘", HEADER_FG));

	return new StyledText(chunks);
}

/**
 * Build the empty history screen (no sessions saved yet).
 */
export function buildEmptyHistory(): StyledText {
	const lines: string[] = [
		"— History —",
		"",
		"No sessions yet.",
		"Complete a typing test to see",
		"your history here.",
		"",
		"Esc: Menu · Ctrl+C: Quit",
	];

	const contentWidth = Math.max(...lines.map((l) => l.length), 20);
	const chunks: TextChunk[] = [];

	chunks.push(colored("┌" + "─".repeat(contentWidth + 2) + "┐\n", HEADER_FG));

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const isTitle = i === 0;
		const isSpacer = line === "";
		const padded = " " + padCenter(line, contentWidth) + " ";

		if (isTitle) {
			chunks.push(colored("│", HEADER_FG));
			chunks.push(colored(padded, SELECTED_FG));
			chunks.push(colored("│\n", HEADER_FG));
		} else if (isSpacer) {
			chunks.push(
				colored("│" + " ".repeat(contentWidth + 2) + "│\n", HEADER_FG),
			);
		} else {
			chunks.push(colored("│", HEADER_FG));
			chunks.push(...stringToStyledText(padded).chunks);
			chunks.push(colored("│\n", HEADER_FG));
		}
	}

	chunks.push(colored("└" + "─".repeat(contentWidth + 2) + "┘", HEADER_FG));
	return new StyledText(chunks);
}

/**
 * Build the session detail screen, reusing stats layout and WPM chart.
 */
export function buildHistoryDetail(session: StoredSession): StyledText {
	const modeStr = formatModeOption(session);
	const dateStr = formatDate(session.timestamp);
	const chartString = buildWpmChart(session.wpmHistory);
	const chartLines = chartString ? chartString.split("\n") : [];

	const lines: string[] = [
		`— Session #${session.id} —`,
		"",
		`${dateStr} · ${modeStr} · ${session.durationSeconds}s`,
		"",
		`WPM:        ${Math.round(session.wpm)}`,
		`Raw WPM:    ${Math.round(session.rawWpm)}`,
		`Accuracy:   ${session.accuracy}%`,
		`Chars:      ${session.correctChars} / ${session.totalChars}`,
		`Errors:     ${session.errors}`,
	];

	if (chartLines.length > 1) {
		lines.push("");
		lines.push("WPM over time:");
		for (const chartLine of chartLines) {
			lines.push(chartLine);
		}
	}

	lines.push("");
	lines.push("Tab: Re-run · Esc: History · Ctrl+C: Quit");

	const contentWidth = Math.max(...lines.map((l) => l.length), 20);
	const chunks: TextChunk[] = [];

	chunks.push(colored("┌" + "─".repeat(contentWidth + 2) + "┐\n", HEADER_FG));

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const isTitle = i === 0;
		const isSpacer = line === "";
		const padded = " " + padCenter(line, contentWidth) + " ";

		if (isTitle) {
			chunks.push(colored("│", HEADER_FG));
			chunks.push(colored(padded, SELECTED_FG));
			chunks.push(colored("│\n", HEADER_FG));
		} else if (isSpacer) {
			chunks.push(
				colored("│" + " ".repeat(contentWidth + 2) + "│\n", HEADER_FG),
			);
		} else {
			chunks.push(colored("│", HEADER_FG));
			chunks.push(...stringToStyledText(padded).chunks);
			chunks.push(colored("│\n", HEADER_FG));
		}
	}

	chunks.push(colored("└" + "─".repeat(contentWidth + 2) + "┘", HEADER_FG));
	return new StyledText(chunks);
}
