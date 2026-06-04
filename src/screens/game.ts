import { StyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import type { GameMode, Word } from "../lib/types";
import { colored, wordText } from "../ui/word-display";
import { HEADER_FG } from "../ui/theme";

/** Format elapsed seconds as MM:SS */
function formatElapsed(totalSeconds: number): string {
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function buildGame(
	mode: GameMode,
	seconds: number,
	liveWpm: number,
	liveRawWpm: number,
	words: Word[],
	currentWordIndex: number,
): StyledText {
	const chunks: TextChunk[] = [];

	// Header — muted color
	const timeDisplay =
		mode === "time" ? `${seconds}s` : formatElapsed(seconds);
	chunks.push(
		colored(
			`⏱ ${timeDisplay}    WPM: ${liveWpm}  RAW: ${liveRawWpm}\n\n`,
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
			// safe: TextChunk only requires text/strings and optional fg
			chunks.push({ text: "\n" } as TextChunk);
		}
	}

	// Footer
	chunks.push(colored("\nEsc: Menu · Ctrl+C: Quit", HEADER_FG));

	return new StyledText(chunks);
}
