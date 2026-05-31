import { StyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import type { Word } from "../lib/types";
import { colored, wordText } from "../ui/word-display";
import { HEADER_FG } from "../ui/theme";

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
			// safe: TextChunk only requires text/strings and optional fg
			chunks.push({ text: "\n" } as TextChunk);
		}
	}

	// Footer
	chunks.push(colored("\nEsc: Menu · Ctrl+C: Quit", HEADER_FG));

	return new StyledText(chunks);
}
