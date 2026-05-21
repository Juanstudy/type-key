# SDD Tasks: 02-ui-polish

Estimated total: 6–8 hours
Review workload: ~300 lines changed (moderate)

## Phase 1: Layout Infrastructure (~2h)

### Task 1.1: Add Box + flex centering to root renderer

**File:** `src/index.ts`
**Acceptance:**

- Root renderer has flex centering (`justifyContent: center`, `alignItems: center`)
- Content Box with `maxWidth: 80` is added as child
- All screens render inside this Box
- Centering works on terminal resize

**Implementation:**

```ts
// In main(), after creating renderer:
const contentBox = Box({
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  height: "100%",
});
renderer.root.add(contentBox);
```

### Task 1.2: Refactor show() to use content setter

**File:** `src/index.ts`
**Acceptance:**

- `show()` accepts `StyledText | string`
- Updates existing Text element's `.content` property
- No more remove+recreate
- Single Text element reused across all screens

**Implementation:**

```ts
let screenText: TextRenderable | null = null;

function show(content: StyledText | string): void {
  if (!renderer) return;
  if (!screenText) {
    screenText = Text({ content });
    contentBox.add(screenText);
  } else {
    screenText.content =
      typeof content === "string" ? stringToStyledText(content) : content;
  }
  renderer.requestRender();
}
```

### Task 1.3: Verify layout tests

**File:** `src/screens.test.ts` (new test block)
**Acceptance:**

- Test that StyledText can be created from chunk array
- Test that content updates don't crash
- All existing 73 tests pass

---

## Phase 2: Styled Screens (~3h)

### Task 2.1: Add color helpers

**File:** `src/screens.ts`
**Acceptance:**

- Export color functions: `correctFg`, `incorrectFg`, `extraFg`, `untypedFg`
- Colors are `RGBA` values or string hex codes
- Colors match a cohesive palette

**Implementation:**

```ts
import { green, red, white } from "@opentui/core";
// fg() color functions produce TextChunk with color applied
```

### Task 2.2: Convert wordText() to return TextChunk[]

**File:** `src/screens.ts`
**Acceptance:**

- `wordText()` returns `TextChunk[]` instead of `string`
- Each letter has correct color based on its `LetterState`
- Words with errors get an indicator
- Test: chunk array length matches letter count

### Task 2.3: Convert buildMenu() to StyledText

**File:** `src/screens.ts`
**Acceptance:**

- Returns `StyledText`
- Title line is brighter/highlighted
- Selected option has a distinct color
- Test: chunks contain correct labels

### Task 2.4: Convert buildGame() to StyledText

**File:** `src/screens.ts`
**Acceptance:**

- Returns `StyledText`
- Header (timer + WPM) uses muted/secondary color
- Words use wordText() chunks
- Test: output contains timer and WPM values

### Task 2.5: Convert buildResults() to StyledText

**File:** `src/screens.ts`
**Acceptance:**

- Returns `StyledText`
- Labels in one color, values in another
- Test: contains stat values

### Task 2.6: Update tests for StyledText output

**File:** `src/screens.test.ts`
**Acceptance:**

- All screen tests verify chunk structure instead of string content
- Color correctness for each letter state
- All 73 + new tests pass

---

## Phase 3: Visual Polish (~1.5h)

### Task 3.1: ASCII art title on menu

**File:** `src/index.ts`, `src/screens.ts`
**Acceptance:**

- Menu shows "Monkeyterm" in ASCII art font
- ASCIIFont element is added/removed when entering/leaving menu
- Does not appear on game or results screens

### Task 3.2: Results border

**File:** `src/screens.ts`
**Acceptance:**

- Results screen renders inside a Box with border
- Box title is "Results"
- Border is single-line style

### Task 3.3: Final layout polish

**File:** `src/index.ts`, `src/screens.ts`
**Acceptance:**

- Consistent vertical padding across screens
- No visual shift when transitioning between screens
- Game header does not overlap with word display
- Menu options have adequate vertical spacing

---

## Review & Merge (~0.5h)

### Task 4.1: Code review pass

- Typecheck clean
- Zero `any` in new code
- All 73 existing tests + new tests pass
- Run `bun run dev` and visually verify all screens

### Task 4.2: Judgment Day (optional)

- Dual adversarial review if diff > 400 lines
- Otherwise, single review pass

### Task 4.3: Commit and PR

- Commit with descriptive message
- Push to `feat/02-ui-polish`
- Open PR against main

---

## Risk Mitigation

| Risk                                 | Task | Mitigation                                                                          |
| ------------------------------------ | ---- | ----------------------------------------------------------------------------------- |
| Text.content setter doesn't work     | 1.2  | Test immediately after implementing; fall back to remove+add with stable ID         |
| StyledText import path changes       | 2.1  | Pin @opentui/core version; check exports before implementing                        |
| ASCIIFont renderable adds complexity | 3.1  | Skip ASCII font if it adds more than 10 lines of setup; use plain bold text instead |
