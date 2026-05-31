import { chart, renderToString, sparkArea } from "@crafter/charts";
import type { TextChunk } from "@opentui/core";
import { stringToStyledText } from "@opentui/core";
import { HEADER_FG } from "./theme";
import { colored } from "./word-display";

/**
 * Downsample an array to at most `maxPoints` by taking evenly spaced samples.
 */
export function downsample(data: number[], maxPoints: number): number[] {
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
 * Render chart lines inside a box: left-aligned with right padding
 * to fill the content width, avoiding padCenter which breaks chart alignment.
 */
export function renderChartLines(
	lines: string[],
	contentWidth: number,
): TextChunk[] {
	const chunks: TextChunk[] = [];
	for (const chartLine of lines) {
		const padded =
			" " +
			chartLine +
			" ".repeat(Math.max(0, contentWidth - chartLine.length + 1));
		chunks.push(colored("│", HEADER_FG));
		chunks.push(...stringToStyledText(padded).chunks);
		chunks.push(colored("│\n", HEADER_FG));
	}
	return chunks;
}

/**
 * Build a WPM chart using @crafter/charts.
 * Returns empty string when there are fewer than 2 data points.
 *
 * Use style "line" (default) for a full braille chart with y-axis;
 * use style "area" for a compact area sparkline.
 */
export function buildWpmChart(
	wpmHistory: number[],
	options?: {
		height?: number;
		style?: "line" | "area";
		label?: string;
	},
): string {
	if (wpmHistory.length < 2) return "";
	const downsampled = downsample(wpmHistory, 40);

	if (options?.style === "area") {
		return sparkArea(downsampled, {
			height: options?.height ?? 3,
		});
	}

	// Default: full bar chart with block characters (█) + y-axis
	const dataPoints = downsampled.map((wpm, i) => ({ i, wpm }));
	const c = chart({
		width: "auto",
		height: options?.height ?? 6,
		charset: "block",
	})
		.data(dataPoints, { xKey: "i" })
		.yAxis({ format: (v: number) => v.toFixed(0) })
		.bar({
			key: "wpm",
			color: "green",
			label: options?.label ?? "WPM",
		});
	return renderToString(c);
}

export function padCenter(s: string, width: number): string {
	const pad = Math.max(0, width - s.length);
	const left = Math.floor(pad / 2);
	const right = pad - left;
	return " ".repeat(left) + s + " ".repeat(right);
}
