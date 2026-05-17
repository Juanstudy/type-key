import { createCliRenderer, Text, fg, StyledText, stringToStyledText } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
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

// ── Styled text helpers ───────────────────────────────────────────────────

const C_CORRECT = "#00FF00";
const C_INCORRECT = "#FF3333";
const C_EXTRA = "#FFDD00";
const C_DIM = "#666666";
const C_TITLE = "#00FF00";
const C_HIGHLIGHT = "#FFFFFF";
const C_NORMAL = "#AAAAAA";
const C_ACCENT = "#FFAA00";
const C_BLUE = "#00AAFF";

function nl(): TextChunk[] {
	return [stringToStyledText("\n") as any];
}

function letterChunks(letter: Letter): TextChunk[] {
	switch (letter.state) {
		case "correct": return [fg(C_CORRECT)(letter.char)];
		case "incorrect": return [fg(C_INCORRECT)(letter.char)];
		case "extra": return [fg(C_EXTRA)(letter.char)];
		default: return [fg(C_NORMAL)(letter.char)];
	}
}

function wordChunks(word: Word): TextChunk[] {
	const chunks: TextChunk[] = [];
	for (const l of word.letters) {
		chunks.push(...letterChunks(l));
	}
	if (!word.isCompleted) chunks.push(stringToStyledText(" ") as any);
	return chunks;
}

// ── Screen content builders ───────────────────────────────────────────────

let renderer: CliRenderer | null = null;
let screenText: ReturnType<typeof Text> | null = null;

function setContent(chunks: TextChunk[]): void {
	if (!screenText) return;
	screenText.content = new StyledText(chunks);
	renderer?.requestRender();
}

function buildMenuContent(): TextChunk[] {
	const c: TextChunk[] = [];

	c.push(fg(C_TITLE)(`Monkeyterm v${VERSION}`));
	c.push(...nl());
	c.push(...nl());
	c.push(fg(C_DIM)("Select time and press Enter to start"));
	c.push(...nl());
	c.push(...nl());

	for (let i = 0; i < TIME_OPTIONS.length; i++) {
		const t = TIME_OPTIONS[i]!;
		const sel = i === state.selectedTimeIndex;
		const prefix = sel ? "▸ " : "  ";
		c.push(fg(sel ? C_TITLE : C_NORMAL)(`${prefix}${t}s`));
		c.push(...nl());
	}

	c.push(...nl());
	c.push(fg(C_DIM)("\u2191\u2193 Navigate  \u00b7  Enter Start  \u00b7  Ctrl+C Quit"));

	return c;
}

function buildGameContent(): TextChunk[] {
	const c: TextChunk[] = [];
	if (!state.engine || !state.timer) return c;

	const gs: GameState = state.engine.getGameState();
	const remaining = Math.ceil(state.timer.getRemainingSeconds());

	c.push(fg(C_ACCENT)(`\u23F1 ${remaining}s    WPM: ${state.liveWpm}  RAW: ${state.liveRawWpm}`));
	c.push(...nl());
	c.push(...nl());

	const words = gs.words;
	const curIdx = gs.currentWordIndex;
	const start = Math.max(0, curIdx - 1);
	const end = Math.min(words.length, start + 3);

	for (let i = start; i < end; i++) {
		const w = words[i]!;
		if (i === curIdx) {
			// Current word: colored letters
			c.push(...wordChunks(w));
		} else {
			// Other words: dim
			const text = w.letters.map((l: Letter) => l.char).join("") + (w.isCompleted ? "" : " ");
			c.push(fg(C_DIM)(text));
		}
		c.push(...nl());
	}

	c.push(...nl());
	c.push(fg(C_DIM)("Esc: Menu  \u00b7  Ctrl+C: Quit"));

	return c;
}

function buildResultsContent(): TextChunk[] {
	const c: TextChunk[] = [];
	if (!state.result) return c;

	const r = state.result;
	const accColor = r.accuracy >= 90 ? C_CORRECT : r.accuracy >= 75 ? C_ACCENT : C_INCORRECT;

	c.push(fg(C_TITLE)("\u2014 Results \u2014"));
	c.push(...nl());
	c.push(...nl());
	c.push(fg(C_HIGHLIGHT)(`WPM:        ${r.wpm}`));
	c.push(...nl());
	c.push(fg(C_NORMAL)(`Raw WPM:    ${r.rawWpm}`));
	c.push(...nl());
	c.push(fg(accColor)(`Accuracy:   ${r.accuracy}%`));
	c.push(...nl());
	c.push(fg(C_NORMAL)(`Chars:      ${r.correctChars} / ${r.totalChars}`));
	c.push(...nl());
	c.push(fg(r.errors > 0 ? C_INCORRECT : C_CORRECT)(`Errors:     ${r.errors}`));
	c.push(...nl());
	c.push(...nl());
	c.push(fg(C_DIM)("Tab: Restart  \u00b7  Esc: Menu  \u00b7  Ctrl+C: Quit"));

	return c;
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
	setContent(buildMenuContent());
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

	if (state.timer) state.timer.stop();
	state.timer = new Timer(
		timeOpt,
		{
			onStart: () => {},
			onTick: (remainingSec: number) => {
				state.elapsedSeconds = timeOpt - remainingSec;
				updateLiveWpm();
				setContent(buildGameContent());
			},
			onComplete: () => {
				goResults();
			},
		},
		250,
	);

	setContent(buildGameContent());
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

	setContent(buildResultsContent());
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
				setContent(buildMenuContent());
			} else if (key.name === "down") {
				state.selectedTimeIndex = Math.min(TIME_OPTIONS.length - 1, state.selectedTimeIndex + 1);
				setContent(buildMenuContent());
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

			if (!state.gameStarted && key.name !== "backspace" && key.name.length === 1) {
				state.gameStarted = true;
				state.timer.start();
			}

			if (key.name === "backspace") {
				state.engine.backspace();
				setContent(buildGameContent());
			} else if (key.name === "space") {
				state.engine.type(" ");
				setContent(buildGameContent());
			} else if (key.name && key.name.length === 1) {
				state.engine.type(key.name);
				setContent(buildGameContent());
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

	// Create ONE persistent Text element — never remove/replace
	screenText = Text({
		content: "",
		fg: "#FFFFFF",
	});
	renderer.root.add(screenText);

	// Key handler
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
