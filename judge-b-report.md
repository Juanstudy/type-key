# Judge B — Blind Adversarial Review

**Target:** type-key (Monkeyterm) commit 588a66a
**Role:** Judge B (no communication with Judge A)

---

## CRITICAL — 1 finding

### 1. Undefined `key.name` crashes game start guard

- **File:** `src/index.ts` (line 168–169)
- **Description:** The game-start detection guard checks `!state.gameStarted && key.name !== "backspace" && key.name.length === 1` without a null guard on `key.name`. If any keypress event arrives where `key.name` is `undefined` or `null` (e.g. modifier-only keys, mouse events, or an edge case in key-input normalization), evaluating `key.name.length` throws `TypeError: Cannot read properties of undefined (reading 'length')`. This crashes the application before the timer even starts. The adjacent single-char branch at line 183 correctly guards with `key.name && key.name.length === 1`.
- **Suggested fix:** Reorder the condition to `key.name && key.name.length === 1 && key.name !== "backspace"` and negate the whole expression or restructure the three-way branch.

---

## WARNING (real) — 3 findings

### 2. `show()` remove+recreate pattern can throw on stale element ID

- **File:** `src/index.ts` (lines 65–69)
- **Description:** `show()` removes the previous `screenText` element by its `.id` and then creates a new one. If `show()` is called twice from sequential microtasks (e.g. a keypress handler and a timer tick queued in the same event-loop phase), the first call stores a new element into `screenText`; the second call then tries to `remove()` that newly-added element by its ID. The OpenTUI root likely throws or logs a warning when asked to remove a child that was never committed to the tree, or whose ID is unknown. Worse, if the `.id` property is `undefined`, `remove("")` may silently succeed but leak the element. This pattern is inherently fragile and depends on single-threaded non-reentrant ordering.
- **Suggested fix:** Cache the Text element and use a content setter if OpenTUI supports it, or use a stable ID assigned once and hold a ref to the VNode tree instead of remove+recreate.

### 3. `as any` casts bypass TypeScript strict checking in two locations

- **File:** `src/index.ts` (line 67: `(screenText as any).id`; line 226: `(renderer.keyInput as any).on(...)`)
- **Description:** Two unconditional `as any` casts defeat the `strict: true` + `noUncheckedIndexedAccess: true` compiler configuration. The comment on line 225 acknowledges `keyInput` EventEmitter type incompatibility but does not address the root cause. The `(screenText as any).id` escape masks the fact that `Text`'s return type does not expose `id`, making the remove logic fragile against OpenTUI type changes. These are the only two `as any` casts in the codebase and both are in the critical UI path.
- **Suggested fix:** Assert a narrower interface that includes `id: string` on Text, or store the ID string separately. For `keyInput`, add a proper type declaration or use `unknown` + branded check instead of `any`.

### 4. Duplicate `SessionResult` interface — exported type is dead code

- **File:** `src/lib/types.ts` (lines 16–25) vs `src/index.ts` (lines 20–26)
- **Description:** Both files define an interface named `SessionResult` with different shapes. The `types.ts` version carries `date`, `mode`, `duration`, `wordCount`, `language`, `chars`, `errors`; the local version in `index.ts` has `wpm`, `rawWpm`, `accuracy`, `correctChars`, `totalChars`, `errors`. The exported one is never imported anywhere in the codebase — `index.ts` uses only the local definition. This dead type will confuse future maintainers and is not caught by tree-shaking since type exports are preserved.
- **Suggested fix:** Remove the `SessionResult` type from `types.ts` and import the local definition, or consolidate into a single interface used by both the engine layer and the UI layer.

---

## WARNING (theoretical) — 2 findings

### 5. `totalChars` includes extra characters but raw WPM formula doesn't account for non-word keystrokes

- **File:** `src/engine/wpm.ts` (lines 20–24)
- **Description:** Raw WPM is `(totalChars / 5) / durationMinutes`, where `totalChars` includes extra characters beyond the original word length and correctly-typed space advances. However, `totalChars` does NOT count the space keystroke itself (space is a no-op in `type()` for advancing words and never increments `totalChars` or `correctChars`). This inconsistency means the raw WPM denominator only covers letter keystrokes, while extra characters inflate the numerator. In a contrived scenario where the user types 50 extra characters per word, raw WPM becomes unrepresentative of actual keystroke throughput. This is consistent with Monkeytype's approach but differs from the "total keystrokes including spaces" convention used by some typing tests.
- **Suggested fix:** Either document that spaces are excluded from raw WPM intentionally, or count the space keypress when it successfully advances a word.

### 6. `pause()` captures `elapsedMs` but subsequent `stop()` resets it — double-pause edge case

- **File:** `src/engine/timer.ts` (lines 106–108)
- **Description:** If `pause()` is called, `elapsedMs` is captured from wall time. If the timer is then `stop()`'d, `elapsedMs` is reset to 0. If the caller then calls `getRemainingSeconds()` expecting the captured-pause value, they see the full duration instead. This is technically correct (stopped = reset) but could surprise a caller that pauses then stops and expects a post-pause remaining time to survive. Not triggered by current UI code, which always creates a new Timer on start.
- **Suggested fix:** No code change needed — a minor design note. Could add a `getElapsedMs()` accessor for callers that need the captured value before stop.

---

## SUGGESTION — 3 findings

### 7. Unused `_errors` parameter in WPMCalculator

- **File:** `src/engine/wpm.ts` (line 16)
- **Description:** The `WPMInput` type includes `errors`, but `WPMCalculator.calculate()` destructures it as `errors: _errors` and never reads it. The `errors` count is tracked separately by the engine and displayed in results but plays no role in WPM or accuracy calculation. The underscore prefix signals intentional non-use but the unused binding is still a code smell that increases cognitive load.
- **Suggested fix:** Omit `errors` from `WPMStats` return (already not used) and mark it `@internal` or remove from `WPMInput` if not needed by any caller.

### 8. Word count hardcoded to 50 in `goGame()` despite `WordCountOption` type

- **File:** `src/index.ts` (line 113)
- **Description:** `shuffleWords(50)` is hardcoded. The type system defines `WordCountOption = 10 | 25 | 50 | 100` in `types.ts`, and `GameConfig.wordCount` references it, but no UI path allows selecting word count. The game always generates 50 words regardless of duration. While this works for timed mode, the disconnect between the type system and the actual behavior will cause bugs when word-count selection is added later.
- **Suggested fix:** Use `WordCountOption` as a const or read from `GameConfig` defaults, and add a comment noting that timed mode ignores word count.

### 9. No timer cleanup in SIGINT handler

- **File:** `src/index.ts` (lines 229–231)
- **Description:** The SIGINT handler calls `renderer?.destroy()` and `process.exit(0)` without calling `state.timer?.stop()`. While `process.exit()` kills all pending intervals/microtasks immediately, this means the timer interval is not cleared in a controlled manner. If `destroy()` triggers any asynchronous cleanup that calls back into timer state, the `renderer?.destroy()` call may race with lingering intervals.
- **Suggested fix:** Call `state.timer?.stop()` before `renderer?.destroy()` to ensure clean teardown.

---

## Summary

| Count | Severity              |
| ----: | --------------------- |
|     1 | CRITICAL              |
|     3 | WARNING (real)        |
|     2 | WARNING (theoretical) |
|     3 | SUGGESTION            |

**One crash-causing bug** (undefined `key.name` guard missing), **three real issues** (fragile element lifecycle, type escapes, dead type code), and **minor observations** for future-proofing. The engine layer (`typing.ts`, `timer.ts`, `wpm.ts`) is structurally sound with reasonable test coverage. The UI layer (`index.ts`) carries the most risk due to unguarded keyboard handling and fragile text-element management.

Skill Resolution: paths-injected — judgment-day skill
