import { StyledText, stringToStyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import { colored } from "../ui/word-display";
import { buildWpmChart, renderChartLines, padCenter } from "../ui/chart";
import { HEADER_FG, SELECTED_FG } from "../ui/theme";
import type { SessionResult } from "../lib/types";

export function buildResults(
	result: SessionResult,
	wpmHistory: number[] = [],
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

	// Calculate content width from stats + footer + chart (to keep box wide enough)
	const footerLine = "Tab: Restart · Esc: Menu · Ctrl+C: Quit";
	const chartWidths = chartLines.map((l) => l.length);
	const contentWidth = Math.max(
		...lines.map((l) => l.length),
		footerLine.length,
		...chartWidths,
		20,
	);

	const chunks: TextChunk[] = [];

	// Top border
	chunks.push(colored("┌" + "─".repeat(contentWidth + 2) + "┐\n", HEADER_FG));

	// Centered lines: stats
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
