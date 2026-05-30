import { StyledText, stringToStyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import type { StoredSession, SessionAggregates } from "../lib/types";
import { colored } from "../ui/word-display";
import { buildWpmChart, renderChartLines, padCenter } from "../ui/chart";
import { HEADER_FG, SELECTED_FG } from "../ui/theme";

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
	const trendLines: string[] = [];
	if (aggregates.recentWpms.length >= 2) {
		const trend = buildWpmChart(aggregates.recentWpms, {
			height: 3,
			style: "area",
		});
		if (trend) {
			trendLines.push("WPM trend (last 15):");
			for (const chartLine of trend.split("\n")) {
				trendLines.push(chartLine);
			}
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
		lines.push(
			`Page ${page + 1}/${totalPages}   ↑↓/jk Select  ← →/hl Page  Enter View`,
		);
	}
	lines.push("Esc: Menu · Ctrl+C: Quit");

	// Compute content width from all content including chart
	const allWidths = [
		...lines.map((l) => l.length),
		...trendLines.map((l) => l.length),
		20,
	];
	const contentWidth = Math.max(...allWidths);
	const chunks: TextChunk[] = [];

	// Top border
	chunks.push(colored("┌" + "─".repeat(contentWidth + 2) + "┐\n", HEADER_FG));

	// Stats section (centered) — only up to sessionStart, not all lines
	const sessionStart =
		4 +
		(aggregates.time.sessions > 0 ? 1 : 0) +
		(aggregates.words.sessions > 0 ? 1 : 0);
	for (let i = 0; i < sessionStart; i++) {
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

	// Trend chart section (left-aligned)
	if (trendLines.length > 0) {
		// First line is the label "WPM trend (last 15):" - centered
		const labelPadded = " " + padCenter(trendLines[0]!, contentWidth) + " ";
		chunks.push(colored("│", HEADER_FG));
		chunks.push(...stringToStyledText(labelPadded).chunks);
		chunks.push(colored("│\n", HEADER_FG));
		// Chart lines - left-aligned
		chunks.push(...renderChartLines(trendLines.slice(1), contentWidth));
		// Spacer after chart
		chunks.push(colored("│" + " ".repeat(contentWidth + 2) + "│\n", HEADER_FG));
	}

	// Session rows + footer (centered)
	for (let i = sessionStart; i < lines.length; i++) {
		const line = lines[i]!;
		const isSpacer = line === "";
		const rowIndex = i - sessionStart;
		const isSelectedRow = sessions.length > 0 && rowIndex < sessions.length;
		const isActuallySelected = isSelectedRow && rowIndex === selectedIndex;

		const padded = " " + padCenter(line, contentWidth) + " ";
		if (isSpacer) {
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
	const chartString = buildWpmChart(session.wpmHistory, {
		height: 6,
		label: "WPM",
	});
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

	// Calculate content width from all content including chart
	const footerLine = "Tab: Re-run · Esc: History · Ctrl+C: Quit";
	const chartWidths = chartLines.map((l) => l.length);
	const contentWidth = Math.max(
		...lines.map((l) => l.length),
		footerLine.length,
		...chartWidths,
		20,
	);
	const chunks: TextChunk[] = [];

	chunks.push(colored("┌" + "─".repeat(contentWidth + 2) + "┐\n", HEADER_FG));

	// Stats section (centered)
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

	// Spacer before footer
	chunks.push(colored("│" + " ".repeat(contentWidth + 2) + "│\n", HEADER_FG));
	// Footer
	const footerPadded = " " + padCenter(footerLine, contentWidth) + " ";
	chunks.push(colored("│", HEADER_FG));
	chunks.push(...stringToStyledText(footerPadded).chunks);
	chunks.push(colored("│\n", HEADER_FG));

	chunks.push(colored("└" + "─".repeat(contentWidth + 2) + "┘", HEADER_FG));
	return new StyledText(chunks);
}
