declare module "asciichart" {
	interface PlotConfig {
		offset?: number;
		padding?: string;
		height?: number;
		format?: (x: number, i: number) => string;
		colors?: (string | undefined)[];
		min?: number;
		max?: number;
		symbols?: string[];
	}

	export function plot(series: number[], config?: PlotConfig): string;
	export function plot(series: number[][], config?: PlotConfig): string;

	export const blue: string;
	export const green: string;
	export const red: string;
	export const defaultColor: string;

	const asciichart: {
		plot: typeof plot;
		blue: string;
		green: string;
		red: string;
		defaultColor: string;
	};

	export default asciichart;
}
