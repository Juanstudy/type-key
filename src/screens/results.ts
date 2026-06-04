import { StyledText, stringToStyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import { colored } from "../ui/word-display";
import { buildWpmChart, renderChartLines, padCenter } from "../ui/chart";
import { HEADER_FG, SELECTED_FG } from "../ui/theme";
import type { SessionResult, Quote } from "../lib/types";

/** Max characters for quote text display in results */
const MAX_QUOTE_DISPLAY_CHARS = 80;

/** Truncate text with ellipsis if it exceeds max length */
function truncateText(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	return text.slice(0, maxLen - 1) + "…";
}

export function buildResults(
	result: SessionResult,
	wpmHistory: number[] = [],
	quote?: Quote,
): StyledText {
	const chartString = buildWpmChart(wpmHistory, {
		height: 6,
		label: "WPM",
	});
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

	// Calculate content width from stats + footer + chart + quote (to keep box wide enough)
	const footerLine = "Tab: Restart · Esc: Menu · Ctrl+C: Quit";
	const chartWidths = chartLines.map((l) => l.length);
	const quoteLines = quote
		? [
				"",
				`"${truncateText(quote.text, MAX_QUOTE_DISPLAY_CHARS)}"`,
				`  — ${quote.source}`,
			]
		: [];
	const contentWidth = Math.max(
		...lines.map((l) => l.length),
		footerLine.length,
		...chartWidths,
		...quoteLines.map((l) => l.length),
		20,
	);

	const chunks: TextChunk[] = [];

	// Top border
	chunks.push(colored("┌" + "─".repeat(contentWidth + 2) + "┐\n", HEADER_FG));

	// Centered lines: stats
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

	// Chart section: left-aligned, not centered
	if (chartLines.length > 0) {
		// Spacer
		chunks.push(colored("│" + " ".repeat(contentWidth + 2) + "│\n", HEADER_FG));
		// Label
		const labelPadded = " " + padCenter("WPM over time:", contentWidth) + " ";
		chunks.push(colored("│", HEADER_FG));
		chunks.push(...stringToStyledText(labelPadded).chunks);
		chunks.push(colored("│\n", HEADER_FG));
		// Chart lines - left-aligned
		chunks.push(...renderChartLines(chartLines, contentWidth));
	}

	// Quote attribution section
	if (quote) {
		chunks.push(colored("│" + " ".repeat(contentWidth + 2) + "│\n", HEADER_FG));
		const quoteText = `"${truncateText(quote.text, MAX_QUOTE_DISPLAY_CHARS)}"`;
		const quotePadded = " " + padCenter(quoteText, contentWidth) + " ";
		chunks.push(colored("│", HEADER_FG));
		chunks.push(...stringToStyledText(quotePadded).chunks);
		chunks.push(colored("│\n", HEADER_FG));
		const sourceText = `  — ${quote.source}`;
		const sourcePadded = " " + padCenter(sourceText, contentWidth) + " ";
		chunks.push(colored("│", HEADER_FG));
		chunks.push(...stringToStyledText(sourcePadded).chunks);
		chunks.push(colored("│\n", HEADER_FG));
	}

	// Spacer before footer
	chunks.push(colored("│" + " ".repeat(contentWidth + 2) + "│\n", HEADER_FG));
	// Footer
	const footerPadded = " " + padCenter(footerLine, contentWidth) + " ";
	chunks.push(colored("│", HEADER_FG));
	chunks.push(...stringToStyledText(footerPadded).chunks);
	chunks.push(colored("│\n", HEADER_FG));

	// Bottom border
	chunks.push(colored("└" + "─".repeat(contentWidth + 2) + "┘", HEADER_FG));

	return new StyledText(chunks);
}
