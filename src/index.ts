import { createCliRenderer, Text, ASCIIFont } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import type { ScreenName, TimeOption } from "./lib/types";
import { TypingEngine } from "./engine/typing";

import { Timer } from "./engine/timer";
import { WPMCalculator } from "./engine/wpm";

import {
	shuffleWords,
	buildMenu,
	buildGame,
	buildResults,
	type SessionResult,
} from "./screens";

interface KeyEvent {
	name?: string;
	ctrl?: boolean;
}

const TIME_OPTIONS: TimeOption[] = [15, 30, 60, 120];
const WORD_COUNT_OPTIONS = [10, 25, 50, 100] as const;

const state: {
	screen: ScreenName;
	mode: "time" | "words";
	selectedTimeIndex: number;
	selectedWordCountIndex: number;
	engine: TypingEngine | null;
	timer: Timer | null;
	words: string[];
	result: SessionResult | null;
	liveWpm: number;
	liveRawWpm: number;
	gameStarted: boolean;
	elapsedSeconds: number;
	wpmHistory: number[];
} = {
	screen: "menu",
	mode: "time",
	selectedTimeIndex: 1,
	selectedWordCountIndex: 1,
	engine: null,
	timer: null,
	words: [],
	result: null,
	liveWpm: 0,
	liveRawWpm: 0,
	gameStarted: false,
	elapsedSeconds: 0,
	wpmHistory: [],
};

const wpmCalc = new WPMCalculator();

const SCREEN_TEXT_ID = "screen-content";
const TITLE_FONT_ID = "menu-title";

let renderer: CliRenderer | null = null;

function show(content: import("@opentui/core").StyledText | string): void {
	if (!renderer) return;
	renderer.root.remove(SCREEN_TEXT_ID);
	const el = Text({ content, id: SCREEN_TEXT_ID });
	renderer.root.add(el);
	renderer.requestRender();
}

// ── Screen transitions ────────────────────────────────────────────────────

function addTitleFont(): void {
	if (!renderer) return;
	renderer.root.remove(TITLE_FONT_ID);
	renderer.root.add(
		ASCIIFont({ text: "Monkeyterm", font: "slick", id: TITLE_FONT_ID }),
	);
	renderer.requestRender();
}

function removeTitleFont(): void {
	if (!renderer) return;
	renderer.root.remove(TITLE_FONT_ID);
}

function getMenuOptions(): number[] {
	return state.mode === "time" ? [...TIME_OPTIONS] : [...WORD_COUNT_OPTIONS];
}

function getMenuSelectedIndex(): number {
	return state.mode === "time"
		? state.selectedTimeIndex
		: state.selectedWordCountIndex;
}

function goMenu(): void {
	state.screen = "menu";
	state.engine = null;
	state.timer = null;
	state.result = null;
	state.gameStarted = false;
	state.liveWpm = 0;
	state.liveRawWpm = 0;
	state.elapsedSeconds = 0;
	state.wpmHistory = [];
	removeTitleFont();
	addTitleFont();
	show(buildMenu(state.mode, getMenuSelectedIndex(), getMenuOptions()));
}

function checkGameComplete(): void {
	if (state.engine?.isComplete()) {
		state.timer?.stop();
		goResults();
	}
}

function goGame(): void {
	const wordCount = WORD_COUNT_OPTIONS[state.selectedWordCountIndex] ?? 50;
	const timeOpt = TIME_OPTIONS[state.selectedTimeIndex] ?? 30;
	state.screen = "game";
	state.engine = new TypingEngine(shuffleWords(wordCount));
	state.result = null;
	state.gameStarted = false;
	state.liveWpm = 0;
	state.liveRawWpm = 0;
	state.elapsedSeconds = 0;
	state.wpmHistory = [];

	removeTitleFont();
	if (state.timer) state.timer.stop();
	state.timer = new Timer(
		timeOpt,
		{
			onStart: () => {},
			onTick: (remainingSec: number) => {
				state.elapsedSeconds = timeOpt - remainingSec;
				updateLiveWpm();
				showGame();
				// In words mode, check completion on every tick
				if (state.mode === "words") checkGameComplete();
			},
			onComplete: () => {
				// Time mode: timer reaching 0 ends the game
				// Words mode: timer is for stats only, completion checked elsewhere
				if (state.mode === "time") goResults();
			},
		},
		250,
	);

	showGame();
}

function showGame(): void {
	if (!state.engine || !state.timer) return;
	const gs = state.engine.getGameState();
	const remaining = Math.ceil(state.timer.getRemainingSeconds());
	show(
		buildGame(
			remaining,
			state.liveWpm,
			state.liveRawWpm,
			gs.words,
			gs.currentWordIndex,
		),
	);
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
	removeTitleFont();
	show(buildResults(state.result!, state.wpmHistory));
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
	state.wpmHistory.push(stats.grossWPM);
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
			if (key.name === "left" || key.name === "right") {
				state.mode = state.mode === "time" ? "words" : "time";
				show(buildMenu(state.mode, getMenuSelectedIndex(), getMenuOptions()));
			} else if (key.name === "up") {
				if (state.mode === "time") {
					state.selectedTimeIndex = Math.max(0, state.selectedTimeIndex - 1);
				} else {
					state.selectedWordCountIndex = Math.max(
						0,
						state.selectedWordCountIndex - 1,
					);
				}
				show(buildMenu(state.mode, getMenuSelectedIndex(), getMenuOptions()));
			} else if (key.name === "down") {
				if (state.mode === "time") {
					state.selectedTimeIndex = Math.min(
						TIME_OPTIONS.length - 1,
						state.selectedTimeIndex + 1,
					);
				} else {
					state.selectedWordCountIndex = Math.min(
						WORD_COUNT_OPTIONS.length - 1,
						state.selectedWordCountIndex + 1,
					);
				}
				show(buildMenu(state.mode, getMenuSelectedIndex(), getMenuOptions()));
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
				showGame();
				if (state.mode === "words") checkGameComplete();
			} else if (key.name === "space") {
				state.engine.type(" ");
				showGame();
				if (state.mode === "words") checkGameComplete();
			} else if (key.name && key.name.length === 1) {
				state.engine.type(key.name);
				showGame();
				if (state.mode === "words") checkGameComplete();
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

	// Center content via flexbox on root
	renderer.root.justifyContent = "center";
	renderer.root.alignItems = "center";

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
