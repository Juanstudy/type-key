import { createCliRenderer, Text } from "@opentui/core";
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

const SCREEN_TEXT_ID = "screen-content";

let renderer: CliRenderer | null = null;

function show(content: import("@opentui/core").StyledText | string): void {
	if (!renderer) return;
	renderer.root.remove(SCREEN_TEXT_ID);
	const el = Text({ content, id: SCREEN_TEXT_ID });
	renderer.root.add(el);
	renderer.requestRender();
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
	show(buildMenu(state.selectedTimeIndex, TIME_OPTIONS));
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
				showGame();
			},
			onComplete: () => goResults(),
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
	show(buildResults(state.result!));
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
				show(buildMenu(state.selectedTimeIndex, TIME_OPTIONS));
			} else if (key.name === "down") {
				state.selectedTimeIndex = Math.min(
					TIME_OPTIONS.length - 1,
					state.selectedTimeIndex + 1,
				);
				show(buildMenu(state.selectedTimeIndex, TIME_OPTIONS));
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
			} else if (key.name === "space") {
				state.engine.type(" ");
				showGame();
			} else if (key.name && key.name.length === 1) {
				state.engine.type(key.name);
				showGame();
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
