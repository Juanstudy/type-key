import { StyledText, stringToStyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import { colored } from "../ui/word-display";
import { HEADER_FG, SELECTED_FG } from "../ui/theme";

export const VERSION = "1.1.0";

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
			"\n← →/hl Mode · ↑↓/jk Option · Enter Start · h History · Ctrl+C Quit",
		).chunks,
	);

	return new StyledText(chunks);
}
