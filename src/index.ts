import { createCliRenderer, Text, Box } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import type { ScreenName, TimeOption } from "./lib/types";
import { TypingEngine } from "./engine/typing";
import type { GameState } from "./engine/typing";
import { Timer } from "./engine/timer";
import { WPMCalculator } from "./engine/wpm";
import type { WPMStats } from "./engine/wpm";
import type { Letter, Word } from "./lib/types";
import wordlist from "./data/wordlists/english.json";

const VERSION = "1.0.0";
const TIME_OPTIONS: TimeOption[] = [15, 30, 60, 120];

// ── State ─────────────────────────────────────────────────────────────────

interface SessionResult {
	wpm: number;
	rawWpm: number;
	accuracy: number;
	correctChars: number;
	totalChars: number;
	errors: number;
}

type ScreenBox = ReturnType<typeof Box>;

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
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a.slice(0, count);
}

// ── Letter coloring ───────────────────────────────────────────────────────

function letterStr(letter: Letter): string {
	switch (letter.state) {
		case "correct":
			return `{green-fg}${letter.char}{/}`;
		case "incorrect":
			return `{red-fg}${letter.char}{/}`;
		case "extra":
			return `{yellow-fg}${letter.char}{/}`;
		default:
			return `{white-fg}${letter.char}{/}`;
	}
}

function wordStr(word: Word): string {
	let s = "";
	for (const letter of word.letters) {
		s += letterStr(letter);
	}
	if (!word.isCompleted) {
		s += " ";
	}
	return s;
}

// ── Screen factories ──────────────────────────────────────────────────────

let renderer: CliRenderer | null = null;

function createBox(): ScreenBox {
	return Box({
		width: "100%" as const,
		height: "100%" as const,
		flexDirection: "column" as const,
		alignItems: "center" as const,
		justifyContent: "center" as const,
	});
}

function switchScreen(box: ScreenBox): void {
	if (!renderer) return;
	// Remove all existing children from root before adding new one
	const existing = renderer.root.getChildren();
	for (let i = existing.length - 1; i >= 0; i--) {
		const child = existing[i];
		if (child) renderer.root.remove((child as any).id ?? (child as any)._id);
	}
	renderer.root.add(box);
	renderer.requestRender();
}

function buildMenu(): ScreenBox {
	const box = createBox();

	box.add(Text({ content: `Monkeyterm v${VERSION}`, fg: "#00FF00" }));
	box.add(Text({ content: "" }));
	box.add(
		Text({ content: "Select time and press Enter to start", fg: "#888888" }),
	);
	box.add(Text({ content: "" }));

	for (let i = 0; i < TIME_OPTIONS.length; i++) {
		const t = TIME_OPTIONS[i]!;
		const sel = i === state.selectedTimeIndex;
		box.add(
			Text({
				content: `${sel ? "▸ " : "  "}${t}s`,
				fg: sel ? "#00FF00" : "#AAAAAA",
			}),
		);
	}

	box.add(Text({ content: "" }));
	box.add(
		Text({
			content:
				"\u2191\u2193 Navigate  \u00b7  Enter Start  \u00b7  Ctrl+C Quit",
			fg: "#666666",
		}),
	);

	return box;
}

function buildGame(): ScreenBox {
	const box = createBox();
	if (!state.engine || !state.timer) return box;

	const gs: GameState = state.engine.getGameState();
	const remaining = Math.ceil(state.timer.getRemainingSeconds());

	box.add(
		Text({
			content: `\u23F1 ${remaining}s    WPM: ${state.liveWpm}  RAW: ${state.liveRawWpm}`,
			fg: "#FFAA00",
		}),
	);
	box.add(Text({ content: "" }));

	const words = gs.words;
	const curIdx = gs.currentWordIndex;
	const start = Math.max(0, curIdx - 1);
	const end = Math.min(words.length, start + 3);

	for (let i = start; i < end; i++) {
		const w = words[i]!;
		const isCurrent = i === curIdx;
		const line = wordStr(w);
		box.add(Text({ content: line, fg: isCurrent ? "#FFFFFF" : "#666666" }));
	}

	box.add(Text({ content: "" }));
	box.add(Text({ content: "Esc: Menu  \u00b7  Ctrl+C: Quit", fg: "#666666" }));

	return box;
}

function buildResults(): ScreenBox {
	const box = createBox();
	if (!state.result) return box;

	const r = state.result;
	const accColor =
		r.accuracy >= 90 ? "#00FF00" : r.accuracy >= 75 ? "#FFAA00" : "#FF3333";

	box.add(Text({ content: "\u2014 Results \u2014", fg: "#00FF00" }));
	box.add(Text({ content: "" }));
	box.add(Text({ content: `WPM:        ${r.wpm}`, fg: "#FFFFFF" }));
	box.add(Text({ content: `Raw WPM:    ${r.rawWpm}`, fg: "#AAAAAA" }));
	box.add(Text({ content: `Accuracy:   ${r.accuracy}%`, fg: accColor }));
	box.add(
		Text({
			content: `Chars:      ${r.correctChars} / ${r.totalChars}`,
			fg: "#AAAAAA",
		}),
	);
	box.add(
		Text({
			content: `Errors:     ${r.errors}`,
			fg: r.errors > 0 ? "#FF3333" : "#00FF00",
		}),
	);
	box.add(Text({ content: "" }));
	box.add(
		Text({
			content: "Tab: Restart  \u00b7  Esc: Menu  \u00b7  Ctrl+C: Quit",
			fg: "#666666",
		}),
	);

	return box;
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
	switchScreen(buildMenu());
}

function goGame(): void {
	const timeOpt = TIME_OPTIONS[state.selectedTimeIndex]!;
	const words = shuffleWords(50);

	state.screen = "game";
	state.words = words;
	state.engine = new TypingEngine(words);
	state.result = null;
	state.gameStarted = false;
	state.liveWpm = 0;
	state.liveRawWpm = 0;
	state.elapsedSeconds = 0;

	state.timer = new Timer(
		timeOpt,
		{
			onStart: () => {},
			onTick: (remainingSec: number) => {
				state.elapsedSeconds = timeOpt - remainingSec;
				updateLiveWpm();
				switchScreen(buildGame());
			},
			onComplete: () => {
				goResults();
			},
		},
		250,
	);

	switchScreen(buildGame());
}

function goResults(): void {
	state.screen = "results";

	if (state.engine && state.timer) {
		const gs = state.engine.getGameState();
		const elapsedMin = state.elapsedSeconds / 60 || 0.01;
		const stats: WPMStats = wpmCalc.calculate({
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

	switchScreen(buildResults());
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

function handleKey(key: any): void {
	switch (state.screen) {
		case "menu":
			if (key.name === "up") {
				state.selectedTimeIndex = Math.max(0, state.selectedTimeIndex - 1);
				switchScreen(buildMenu());
			} else if (key.name === "down") {
				state.selectedTimeIndex = Math.min(
					TIME_OPTIONS.length - 1,
					state.selectedTimeIndex + 1,
				);
				switchScreen(buildMenu());
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
				key.name !== "backspace" &&
				key.name.length === 1
			) {
				state.gameStarted = true;
				state.timer.start();
			}

			if (key.name === "backspace") {
				state.engine.backspace();
				switchScreen(buildGame());
			} else if (key.name === "space") {
				state.engine.type(" ");
				switchScreen(buildGame());
			} else if (key.name && key.name.length === 1) {
				state.engine.type(key.name);
				switchScreen(buildGame());
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
	renderer = await createCliRenderer({
		exitOnCtrlC: true,
	});

	// Workaround: key handler type issues with TS 6.x EventEmitter
	(renderer.keyInput as any).on("keypress", (key: any) => handleKey(key));

	goMenu();

	process.on("SIGINT", () => {
		renderer?.destroy();
		process.exit(0);
	});
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
