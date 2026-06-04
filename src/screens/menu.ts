import { StyledText, stringToStyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import type { GameMode } from "../lib/types";
import { colored } from "../ui/word-display";
import { HEADER_FG, SELECTED_FG } from "../ui/theme";

export const VERSION = "1.1.0";

const MODE_LABELS: Record<GameMode, string> = {
	time: "Time",
	words: "Words",
	quote: "Quotes",
};

export function buildMenu(
	mode: GameMode,
	selectedIndex: number,
	options: number[],
): StyledText {
	const chunks: TextChunk[] = [];

	// Title
	chunks.push(colored(`Monkeyterm v${VERSION}\n\n`, HEADER_FG));

	// Mode header — show all 3 modes with position indicator
	const modes: GameMode[] = ["time", "words", "quote"];
	const currentIdx = modes.indexOf(mode);
	const modeLabels = modes.map((m, i) => {
		const label = MODE_LABELS[m];
		if (i === currentIdx) return label; // current is highlighted separately
		return label;
	});

	// Show current mode highlighted, others muted
	const prevMode = modes[(currentIdx - 1 + modes.length) % modes.length] ?? "time";
	const nextMode = modes[(currentIdx + 1) % modes.length] ?? "words";
	chunks.push(...stringToStyledText(`${MODE_LABELS[prevMode]}  ·  `).chunks);
	chunks.push(colored(MODE_LABELS[mode], SELECTED_FG));
	chunks.push(...stringToStyledText(`  ·  ${MODE_LABELS[nextMode]}\n\n`).chunks);

	// Options (only for time/words modes)
	if (options.length > 0) {
		const suffix = mode === "time" ? "s" : mode === "words" ? " words" : "";
		for (let i = 0; i < options.length; i++) {
			const sel = i === selectedIndex;
			if (sel) {
				chunks.push(colored(`▸ ${options[i]}${suffix}\n`, SELECTED_FG));
			} else {
				chunks.push(...stringToStyledText(`  ${options[i]}${suffix}\n`).chunks);
			}
		}
	} else {
		// Quote mode: show a description
		chunks.push(...stringToStyledText("  Type a random quote\n").chunks);
		chunks.push(...stringToStyledText("  Elapsed time tracking\n").chunks);
	}

	// Hints
	chunks.push(
		...stringToStyledText(
			"\n← →/hl Mode · ↑↓/jk Option · Enter Start · h History · Ctrl+C Quit",
		).chunks,
	);

	return new StyledText(chunks);
}
