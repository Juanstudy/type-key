import { Text, ASCIIFont } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import type {
	GameMode,
	ScreenName,
	TimeOption,
	StoredSession,
	SessionAggregates,
	SessionResult,
} from "./types";
import {
	initDB,
	saveSession,
	getSessions,
	getSession,
	getAggregates,
} from "./db";
import { TypingEngine } from "../engine/typing";
import { Timer } from "../engine/timer";
import { WPMCalculator } from "../engine/wpm";
import {
	shuffleWords,
	buildMenu,
	buildGame,
	buildResults,
	buildHistory,
	buildEmptyHistory,
	buildHistoryDetail,
} from "../screens";

// Re-export for index.ts convenience
export { initDB };

// ── Types ─────────────────────────────────────────────────────────────────

interface KeyEvent {
	name?: string;
	ctrl?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────

const TIME_OPTIONS: TimeOption[] = [15, 30, 60, 120];
const WORD_COUNT_OPTIONS = [10, 25, 50, 100] as const;

// ── State ─────────────────────────────────────────────────────────────────

const state: {
	screen: ScreenName;
	mode: GameMode;
	selectedTimeIndex: number;
	selectedWordCountIndex: number;
	engine: TypingEngine | null;
	timer: Timer | null;
	result: SessionResult | null;
	liveWpm: number;
	liveRawWpm: number;
	gameStarted: boolean;
	elapsedSeconds: number;
	wpmHistory: number[];
	historyPage: number;
	historyTotalPages: number;
	historySelectedIndex: number;
	historySessions: StoredSession[];
	historyAggregates: SessionAggregates | null;
	historyDetailSession: StoredSession | null;
} = {
	screen: "menu",
	mode: "time",
	selectedTimeIndex: 1,
	selectedWordCountIndex: 1,
	engine: null,
	timer: null,
	result: null,
	liveWpm: 0,
	liveRawWpm: 0,
	gameStarted: false,
	elapsedSeconds: 0,
	wpmHistory: [],
	historyPage: 0,
	historyTotalPages: 1,
	historySelectedIndex: 0,
	historySessions: [],
	historyAggregates: null,
	historyDetailSession: null,
};

const wpmCalc = new WPMCalculator();

const SCREEN_TEXT_ID = "screen-content";
const TITLE_FONT_ID = "menu-title";

let renderer: CliRenderer | null = null;

/** Set the renderer instance (called by index.ts after creation). */
export function setRenderer(r: CliRenderer): void {
	renderer = r;
}

// ── Render ────────────────────────────────────────────────────────────────

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

export function goMenu(): void {
	state.screen = "menu";
	state.engine = null;
	state.timer = null;
	state.result = null;
	state.gameStarted = false;
	state.liveWpm = 0;
	state.liveRawWpm = 0;
	state.elapsedSeconds = 0;
	state.wpmHistory = [];
	state.historyPage = 0;
	state.historyTotalPages = 1;
	state.historySelectedIndex = 0;
	state.historySessions = [];
	state.historyAggregates = null;
	state.historyDetailSession = null;
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

export function goGame(): void {
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

export function goResults(): void {
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

		// Save session to history
		const ts = new Date().toISOString();
		const timeOpt =
			state.mode === "time"
				? (TIME_OPTIONS[state.selectedTimeIndex] ?? 30)
				: null;
		const wordCnt =
			state.mode === "words"
				? (WORD_COUNT_OPTIONS[state.selectedWordCountIndex] ?? 50)
				: null;
		saveSession({
			timestamp: ts,
			mode: state.mode,
			timeOption: timeOpt,
			wordCount: wordCnt,
			wpm: state.result.wpm,
			rawWpm: state.result.rawWpm,
			accuracy: state.result.accuracy,
			correctChars: state.result.correctChars,
			totalChars: state.result.totalChars,
			errors: state.result.errors,
			durationSeconds: state.elapsedSeconds,
			wpmHistory: state.wpmHistory,
			quoteText: null,
			quoteSource: null,
			quoteLength: null,
		});

		removeTitleFont();
		show(buildResults(state.result, state.wpmHistory));
	}
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

// ── History screen ────────────────────────────────────────────────────────

export function goHistory(): void {
	state.screen = "history";
	state.historyPage = 0;
	state.historySelectedIndex = 0;
	state.historySessions = getSessions(10, 0);
	state.historyAggregates = getAggregates();

	const totalSessions = state.historyAggregates?.totalSessions ?? 0;
	state.historyTotalPages = Math.max(1, Math.ceil(totalSessions / 10));

	removeTitleFont();
	if (state.historySessions.length === 0) {
		show(buildEmptyHistory());
	} else {
		show(
			buildHistory(
				state.historySessions,
				state.historyAggregates!,
				state.historyPage,
				state.historyTotalPages,
				state.historySelectedIndex,
			),
		);
	}
}

function goHistoryDetail(sessionId: number): void {
	state.screen = "history-detail";
	state.historyDetailSession = getSession(sessionId);
	if (!state.historyDetailSession) {
		goHistory();
		return;
	}
	removeTitleFont();
	show(buildHistoryDetail(state.historyDetailSession));
}

// ── Keyboard handling ─────────────────────────────────────────────────────

export function handleQuit(): void {
	state.timer?.stop();
	renderer?.destroy();
	process.exit(0);
}

export function handleKey(key: KeyEvent): void {
	// Ctrl+C / Ctrl+Q: quit (terminal en raw mode, no llega SIGINT)
	if (key.name === "c" && key.ctrl) {
		handleQuit();
		return;
	}

	switch (state.screen) {
		case "menu":
			if (key.name === "left" || key.name === "right" || key.name === "l") {
				state.mode = state.mode === "time" ? "words" : "time";
				show(buildMenu(state.mode, getMenuSelectedIndex(), getMenuOptions()));
			} else if (key.name === "up" || key.name === "k") {
				if (state.mode === "time") {
					state.selectedTimeIndex = Math.max(0, state.selectedTimeIndex - 1);
				} else {
					state.selectedWordCountIndex = Math.max(
						0,
						state.selectedWordCountIndex - 1,
					);
				}
				show(buildMenu(state.mode, getMenuSelectedIndex(), getMenuOptions()));
			} else if (key.name === "down" || key.name === "j") {
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
			} else if (key.name === "h") {
				goHistory();
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

		case "history":
			if (key.name === "escape") {
				goMenu();
			} else if (key.name === "up" || key.name === "k") {
				state.historySelectedIndex = Math.max(
					0,
					state.historySelectedIndex - 1,
				);
				show(
					buildHistory(
						state.historySessions,
						state.historyAggregates!,
						state.historyPage,
						state.historyTotalPages,
						state.historySelectedIndex,
					),
				);
			} else if (key.name === "down" || key.name === "j") {
				state.historySelectedIndex = Math.min(
					state.historySessions.length - 1,
					state.historySelectedIndex + 1,
				);
				show(
					buildHistory(
						state.historySessions,
						state.historyAggregates!,
						state.historyPage,
						state.historyTotalPages,
						state.historySelectedIndex,
					),
				);
			} else if (key.name === "left" || key.name === "h") {
				if (state.historyPage > 0) {
					state.historyPage--;
					state.historySelectedIndex = 0;
					state.historySessions = getSessions(10, state.historyPage * 10);
					show(
						buildHistory(
							state.historySessions,
							state.historyAggregates!,
							state.historyPage,
							state.historyTotalPages,
							state.historySelectedIndex,
						),
					);
				}
			} else if (key.name === "right" || key.name === "l") {
				if (state.historyPage < state.historyTotalPages - 1) {
					state.historyPage++;
					state.historySelectedIndex = 0;
					state.historySessions = getSessions(10, state.historyPage * 10);
					show(
						buildHistory(
							state.historySessions,
							state.historyAggregates!,
							state.historyPage,
							state.historyTotalPages,
							state.historySelectedIndex,
						),
					);
				}
			} else if (key.name === "return" || key.name === "enter") {
				const selected = state.historySessions[state.historySelectedIndex];
				if (selected) goHistoryDetail(selected.id);
			}
			break;

		case "history-detail":
			if (key.name === "escape") {
				goHistory();
			} else if (key.name === "tab") {
				const s = state.historyDetailSession;
				if (s) {
					state.mode = s.mode;
					if (s.mode === "time" && s.timeOption !== null) {
						// safe: indexOf confirmed the value is a valid tuple member
						const idx = TIME_OPTIONS.indexOf(
							s.timeOption as (typeof TIME_OPTIONS)[number],
						);
						if (idx >= 0) state.selectedTimeIndex = idx;
					} else if (s.mode === "words" && s.wordCount !== null) {
						// safe: indexOf confirmed the value is a valid tuple member
						const idx = WORD_COUNT_OPTIONS.indexOf(
							s.wordCount as (typeof WORD_COUNT_OPTIONS)[number],
						);
						if (idx >= 0) state.selectedWordCountIndex = idx;
					}
					goGame();
				}
			}
			break;
	}
}
