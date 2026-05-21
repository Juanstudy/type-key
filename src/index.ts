import { createCliRenderer, Text } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import type { ScreenName, TimeOption } from "./lib/types";
import { TypingEngine } from "./engine/typing";

import { Timer } from "./engine/timer";
import { WPMCalculator } from "./engine/wpm";

import type { Letter } from "./lib/types";
import wordlist from "./data/wordlists/english.json";

interface KeyEvent {
	name?: string;
	ctrl?: boolean;
}

const VERSION = "1.0.0";
const TIME_OPTIONS: TimeOption[] = [15, 30, 60, 120];

interface SessionResult {
	wpm: number;
	rawWpm: number;
	accuracy: number;
	correctChars: number;
	totalChars: number;
	errors: number;
}

const state: {
	screen: ScreenName;
	selectedTimeIndex: number;
	engine: TypingEngine | null;
	timer: Timer | null;
	words: string[];
	result: SessionResult | null;
	liveWpm: number;
	liveRawWpm: number;
	gameStarted: boolean;
	elapsedSeconds: number;
} = {
	screen: "menu",
	selectedTimeIndex: 1,
	engine: null,
	timer: null,
	words: [],
	result: null,
	liveWpm: 0,
	liveRawWpm: 0,
	gameStarted: false,
	elapsedSeconds: 0,
};

const wpmCalc = new WPMCalculator();

function shuffleWords(count: number): string[] {
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

function wordText(word: { letters: Letter[]; isCompleted: boolean }): string {
	return (
		word.letters.map((l) => l.char).join("") + (word.isCompleted ? "" : " ")
	);
}

const SCREEN_TEXT_ID = "screen-content";

let renderer: CliRenderer | null = null;

function show(text: string): void {
	if (!renderer) return;
	renderer.root.remove(SCREEN_TEXT_ID);
	const el = Text({ content: text, id: SCREEN_TEXT_ID });
	renderer.root.add(el);
	renderer.requestRender();
}

function buildMenu(): string {
	let s = `Monkeyterm v${VERSION}\n\n`;
	s += "Select time and press Enter to start\n\n";
	for (let i = 0; i < TIME_OPTIONS.length; i++) {
		const sel = i === state.selectedTimeIndex;
		s += `${sel ? "▸ " : "  "}${TIME_OPTIONS[i]}s\n`;
	}
	s += "\n↑↓ Navigate · Enter Start · Ctrl+C Quit";
	return s;
}

function buildGame(): string {
	if (!state.engine || !state.timer) return "";
	const gs = state.engine.getGameState();
	const remaining = Math.ceil(state.timer.getRemainingSeconds());

	let s = `⏱ ${remaining}s    WPM: ${state.liveWpm}  RAW: ${state.liveRawWpm}\n\n`;

	const words = gs.words;
	const curIdx = gs.currentWordIndex;
	const start = Math.max(0, curIdx - 1);
	const end = Math.min(words.length, start + 3);

	for (let i = start; i < end; i++) {
		const word = words[i];
		if (word) s += wordText(word) + "\n";
	}

	s += "\nEsc: Menu · Ctrl+C: Quit";
	return s;
}

function buildResults(): string {
	if (!state.result) return "";
	const r = state.result;
	return [
		"— Results —",
		"",
		`WPM:        ${r.wpm}`,
		`Raw WPM:    ${r.rawWpm}`,
		`Accuracy:   ${r.accuracy}%`,
		`Chars:      ${r.correctChars} / ${r.totalChars}`,
		`Errors:     ${r.errors}`,
		"",
		"Tab: Restart · Esc: Menu · Ctrl+C: Quit",
	].join("\n");
}

// ── Screen transitions ────────────────────────────────────────────────────

function goMenu(): void {
	state.screen = "menu";
	state.engine = null;
	state.timer = null;
	state.result = null;
	state.gameStarted = false;
	state.liveWpm = 0;
	state.liveRawWpm = 0;
	state.elapsedSeconds = 0;
	show(buildMenu());
}

function goGame(): void {
	const timeOpt = TIME_OPTIONS[state.selectedTimeIndex] ?? 30;
	state.screen = "game";
	state.engine = new TypingEngine(shuffleWords(50)); // 50 words fixed for timed mode (WordCountOption for future)
	state.result = null;
	state.gameStarted = false;
	state.liveWpm = 0;
	state.liveRawWpm = 0;
	state.elapsedSeconds = 0;

	if (state.timer) state.timer.stop();
	state.timer = new Timer(
		timeOpt,
		{
			onStart: () => {},
			onTick: (remainingSec: number) => {
				state.elapsedSeconds = timeOpt - remainingSec;
				updateLiveWpm();
				show(buildGame());
			},
			onComplete: () => goResults(),
		},
		250,
	);

	show(buildGame());
}

function goResults(): void {
	state.screen = "results";
	if (state.engine && state.timer) {
		const gs = state.engine.getGameState();
		const elapsedMin = state.elapsedSeconds / 60 || 0.01;
		const stats = wpmCalc.calculate({
			correctChars: gs.correctChars,
			totalChars: gs.totalChars,
			errors: gs.errors,
			durationMinutes: elapsedMin,
		});
		state.result = {
			wpm: stats.grossWPM,
			rawWpm: stats.rawWPM,
			accuracy: stats.accuracy,
			correctChars: gs.correctChars,
			totalChars: gs.totalChars,
			errors: gs.errors,
		};
	}
	show(buildResults());
}

function updateLiveWpm(): void {
	if (!state.engine) return;
	const gs = state.engine.getGameState();
	const elapsedMin = state.elapsedSeconds / 60;
	if (elapsedMin <= 0) return;
	const stats = wpmCalc.calculate({
		correctChars: gs.correctChars,
		totalChars: gs.totalChars,
		errors: gs.errors,
		durationMinutes: elapsedMin,
	});
	state.liveWpm = stats.grossWPM;
	state.liveRawWpm = stats.rawWPM;
}

// ── Keyboard handling ─────────────────────────────────────────────────────

function handleQuit(): void {
	state.timer?.stop();
	renderer?.destroy();
	process.exit(0);
}

function handleKey(key: KeyEvent): void {
	// Ctrl+C / Ctrl+Q: quit (terminal en raw mode, no llega SIGINT)
	if (key.name === "c" && key.ctrl) {
		handleQuit();
		return;
	}

	switch (state.screen) {
		case "menu":
			if (key.name === "up") {
				state.selectedTimeIndex = Math.max(0, state.selectedTimeIndex - 1);
				show(buildMenu());
			} else if (key.name === "down") {
				state.selectedTimeIndex = Math.min(
					TIME_OPTIONS.length - 1,
					state.selectedTimeIndex + 1,
				);
				show(buildMenu());
			} else if (key.name === "return" || key.name === "enter") {
				goGame();
			}
			break;

		case "game": {
			if (!state.engine || !state.timer) break;
			if (key.name === "escape") {
				state.timer.stop();
				goMenu();
				return;
			}

			if (
				!state.gameStarted &&
				key.name &&
				key.name !== "backspace" &&
				key.name.length === 1
			) {
				state.gameStarted = true;
				state.timer.start();
			}

			if (key.name === "backspace") {
				state.engine.backspace();
				show(buildGame());
			} else if (key.name === "space") {
				state.engine.type(" ");
				show(buildGame());
			} else if (key.name && key.name.length === 1) {
				state.engine.type(key.name);
				show(buildGame());
			}
			break;
		}

		case "results":
			if (key.name === "tab") {
				goGame();
			} else if (key.name === "escape") {
				goMenu();
			}
			break;
	}
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	renderer = await createCliRenderer({ exitOnCtrlC: false });

	// Key handler: renderer.keyInput is an EventEmitter.
	// as unknown as { on: ... } is safe because keyInput is always present
	// on CliRenderer and its constructor guarantees it extends EventEmitter.
	(
		renderer.keyInput as unknown as {
			on(event: string, handler: (key: KeyEvent) => void): void;
		}
	).on("keypress", (key) => handleKey(key));

	process.on("SIGINT", handleQuit);

	goMenu();
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
