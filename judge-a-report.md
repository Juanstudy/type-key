# Judge A — Blind Review Report

## Summary

| Severity              | Count |
| --------------------- | ----- |
| CRITICAL              | 0     |
| WARNING (real)        | 4     |
| WARNING (theoretical) | 2     |
| SUGGESTION            | 4     |

---

## Findings

### WARNING (real) #1 — Timer `resume()` does not reset `completed` flag

**File:** `src/engine/timer.ts` (lines 88–118)

**Description:** After `stop()` is called (which sets `this.completed = true`), calling `resume()` will set `this.running = true` and install a new interval, but never clears `this.completed`. The interval callback's first guard `if (this.completed) return;` silently aborts every tick, so the timer appears to run (`isRunning()` returns true) but never calls `onTick` or `onComplete`. This is a broken internal state: the timer lies about being running while producing no callbacks.

In normal game flow, a new `Timer` is created after every `stop()` in `goGame()`, so the bug is not reached during correct gameplay. However, any caller that reuses a stopped `Timer` instance via `resume()` encounters a silent no-op.

**Suggested fix:** Clear `this.completed = false` in `resume()` before setting `this.running = true`.

---

### WARNING (real) #2 — `gameStarted` start-timer guard can crash on missing `key.name`

**File:** `src/index.ts` (line 154)

**Description:** The timer‑start guard is:

```ts
if (
    !state.gameStarted &&
    key.name !== "backspace" &&
    key.name.length === 1
)
```

`key.name` is typed `any`. If OpenTUI emits a keypress event where `key.name` is `undefined` or `null`, this throws a `TypeError` because `key.name.length` is accessed without a truthy guard. Later in the same function (line 171) a second branch correctly guards with `key.name && key.name.length === 1`, so the two checks are inconsistent.

**Suggested fix:** Use `key.name?.length === 1` or `key.name && key.name.length === 1` in the timer‑start guard, matching the later pattern.

---

### WARNING (real) #3 — Timer test with tight timing can be flaky

**File:** `src/engine/timer.test.ts` (lines 34–44)

**Description:**

```ts
const timer = new Timer(1, { ... }, 10); // 10ms interval
timer.start();
await Bun.sleep(15);
expect(onTick).toHaveBeenCalledTimes(1);
```

A 10ms interval with a 15ms `Bun.sleep` leaves only a 5ms margin. On a loaded or throttled CI runner the first tick could be delayed past 15ms, making the count 0, or the event loop could advance fast enough to fire a second tick before the expect runs (at ~20ms). Both outcomes would fail the assertion non‑deterministically.

**Suggested fix:** Increase `Bun.sleep` to at least 30ms and assert `toHaveBeenCalledTimes` with `toBeGreaterThanOrEqual(1)`, or use a mock clock / fake timers for deterministic intervals.

---

### WARNING (real) #4 — `show()` accesses internal/opaque `id` property via `as any`

**File:** `src/index.ts` (lines 63–69)

**Description:** The `show()` function removes the old screen `Text` element via `(screenText as any).id`. This relies on an undocumented internal property of the OpenTUI `Text` VNode. If the OpenTUI `Text` function's return type changes the `id` field name or removes it, the remove call silently fails (the `?? ""` fallback produces an empty string which `root.remove("")` likely ignores), leaving orphaned elements in the render tree and accumulating dead VNodes.

**Suggested fix:** Use `renderer.root.remove(screenText)` if `root.remove` accepts a VNode reference, or keep a `renderer.root.replace(screenText, newScreenText)` pattern. If the API only accepts string IDs, store the ID when the Text element is created rather than reaching into the opaque type.

---

### WARNING (theoretical) #1 — Ctrl+C keypress may type 'c' before SIGINT fires

**File:** `src/index.ts` (lines 146–175)

**Description:** With `createCliRenderer({ exitOnCtrlC: false })`, OpenTUI may emit a keypress event for Ctrl+C before the OS delivers SIGINT. The `handleKey` function does not check `key.ctrl` — if the event has `{ name: "c", ctrl: true }`, the `key.name === "c"` branch fires and calls `state.engine.type("c")` and `show(buildGame())`. The SIGINT handler then kills the process, so the stray 'c' is harmless in practice, but it corrupts the final game state if the timer has just completed.

**Suggested fix:** Add a guard at the top of `handleKey`: `if (key.ctrl) return;` or handle it explicitly.

---

### WARNING (theoretical) #2 — Fisher-Yates shuffle always copies the full wordlist

**File:** `src/index.ts` (lines 40–47)

**Description:** `shuffleWords(50)` copies all 53 words from the wordlist, shuffles them, then slices to 50. If the wordlist ever shrinks below 50 entries, the game silently uses fewer words (no guard or error). Additionally, `Math.random` is used without a seed — this is adequate for a typing test, but the full‑copy with `slice(0, count)` is slightly wasteful for large wordlists (not a problem at current scale, but a latent performance smell).

**Suggested fix:** Add a guard: `const actualCount = Math.min(count, a.length)` and return early or log a warning if `count > a.length`.

---

### SUGGESTION #1 — `WPMCalculator.calculate` accepts but never uses `errors`

**File:** `src/engine/wpm.ts` (line 13)

**Description:**

```ts
const { correctChars, totalChars, errors: _errors, durationMinutes } = input;
```

The `errors` field is destructured solely to suppress the TS `noUnusedLocals` warning and is never referenced in the calculation. Callers (like `goResults()` and `updateLiveWpm()`) pass `gs.errors` believing it contributes to the statistics, but accuracy is computed as `correctChars / totalChars * 100`, which does not involve `errors`. This is misleading — a reader or future maintainer may assume the field is used.

**Suggested fix:** Remove `errors` from `WPMInput` if it is never part of the formula, or add a comment explaining why it is accepted (e.g., for future use / logging).

---

### SUGGESTION #2 — No visual distinction for extra characters in `buildGame()`

**File:** `src/index.ts` (lines 53–56)

**Description:** `wordText()` joins all letters including extras (`["h","e","l","l","o","x","y","z"]`), displaying extra characters inline as if they were part of the word. In a typing test, extras are typically shown with a different style (e.g., red underline or strikethrough) to indicate overflow. The current plain‑text rendering misleads the user about what they typed vs. what the word expects.

**Suggested fix:** Filter out or visually mark letters with `state === "extra"` in the display function. Since the project uses plain text (no ANSI), consider displaying a ˣ or `_` for extra chars, or including them only in a separate overflow region.

---

### SUGGESTION #3 — `buildGame()` may show partial trailing word line

**File:** `src/index.ts` (lines 93–100)

**Description:** The visible window is `start = max(0, curIdx - 1)` to `end = min(words.length, start + 3)`. When `curIdx` is near `words.length`, fewer than 3 words are shown. This is intentional, but a user typing the last word sees a shrinking display, which can be disorienting. Most typing tests keep the display centered or show a fixed count.

**Suggested fix:** Consider a centered window (e.g., always show 3 words centered on `curIdx`) instead of a left‑anchored slice, or pad the display when fewer words remain.

---

### SUGGESTION #4 — String "history" in `ScreenName` type is unused

**File:** `src/lib/types.ts` (line 24)

**Description:** `type ScreenName = "menu" | "game" | "results" | "history"` includes `"history"`, but no code in the reviewed files references or transitions to a history screen. The `state.screen` field carries the dead variant in its type, and `handleKey` has no `case "history"`, so TypeScript's exhaustiveness checking is weakened (the switch silently compiles without a `default` that could catch unhandled screens).

**Suggested fix:** Remove `"history"` from `ScreenName` until a history screen is implemented, or add a `default: break` with a runtime warning.

---

## Verdict

No CRITICAL issues found. The codebase is functional at the current commit with safe game flow. However, the `resume()`‑after‑`stop()` broken state (WARNING #1) and the `show()` internal‑property access (WARNING #4) are the most impactful because they affect correctness and rendering robustness respectively. The timer test flakiness (WARNING #3) should be fixed before CI is added. The missing `key.name` guard (WARNING #2) is a latent crash that only surfaces with unusual key events.

Skill Resolution: paths-injected — judgment-day skill
