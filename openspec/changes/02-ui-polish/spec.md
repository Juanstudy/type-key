# SDD Spec: 02-ui-polish

## Functional Requirements

### FR1: Centered Layout

The app content must be centered both vertically and horizontally in the terminal, regardless of terminal size.

**Acceptance:**

- Content appears in the center of the terminal on startup
- Resizing the terminal re-centers content within 1 render frame
- No content is clipped on terminals ≥80×24

### FR2: Colored Letter States

Typing letters must be color-coded by state:

- `correct`: green foreground (`#98c379` or similar green)
- `incorrect`: red foreground (`#e06c75` or similar red)
- `extra`: red foreground with dim/bold distinction
- `untyped`: default foreground

**Acceptance:**

- Each letter in the game screen has the correct color
- Colors update instantly on keypress
- Backspace returns letter to untyped color

### FR3: Visual Menu

The menu screen must show:

- App title (optionally in ASCII art font)
- Time options in a bordered box
- Selected option clearly highlighted (▸ + different color/brightness)
- Key binding hints at the bottom

**Acceptance:**

- Title is centered
- Options are vertically stacked inside a Box
- Arrow keys move the selection highlight
- Enter starts the game

### FR4: Game Header

The game screen must have a header bar showing:

- Remaining timer (with icon)
- Live WPM
- Live Raw WPM
- These stats should be visually grouped

**Acceptance:**

- Header is visible at the top of the game screen
- WPM updates every tick (250ms)
- Timer decrements in real time

### FR5: Structured Results

The results screen must show:

- A "Results" title in a bordered box
- WPM, Raw WPM, Accuracy, Chars, Errors as labeled rows
- Key binding hints at the bottom

**Acceptance:**

- Stats are left-aligned with labels
- Box has a title "Results"
- Tab and Escape work as expected

### FR6: Consistent Screen Transitions

All three screens (menu, game, results) must share the same layout container — only the inner content changes.

**Acceptance:**

- Screen transitions are instant (no flicker)
- Layout does not shift between screens
- Box dimensions remain consistent

## Non-Functional Requirements

### NFR1: Render Performance

Each `show()` call must complete in under 16ms (60fps).

**Metric:** Benchmarked with `performance.now()` around `show()` calls.

### NFR2: Type Safety

Zero `any` types in all new/modified code.

### NFR3: Test Coverage

All screen builder functions must have unit tests covering:

- StyledText output structure (chunks array)
- Correct color assignments for each letter state
- Menu layout formatting

### NFR4: Terminal Compatibility

Layout must work on terminals ≥80 columns and ≥24 rows. No hardcoded pixel values.

## Test Cases

### TC1: Centered layout

1. Start app
2. Measure content position
3. Verify distance from top ≥ 1/3 of terminal height (visual center)

### TC2: Letter colors

1. Start game
2. Type a correct letter → verify green
3. Type an incorrect letter → verify red
4. Type beyond word length → verify extra styling
5. Backspace → verify untyped color returns

### TC3: Menu navigation

1. Press ↓ → verify selection moves down
2. Press ↑ → verify selection moves up
3. Press ↑ at top → verify stays at top
4. Press ↓ at bottom → verify stays at bottom

### TC4: Game header

1. Start game
2. Verify header shows timer = selected duration
3. Type a letter → verify WPM updates
4. Wait 1 second → verify timer decremented

### TC5: Results display

1. Complete a game (or let timer run out)
2. Verify all stats are displayed with correct values
3. Verify border/title is visible

### TC6: Screen resize

1. Resize terminal to 80×24
2. Verify content is centered
3. Resize to 120×40
4. Verify content is still centered

## Definition of Done

- [ ] FR1–FR6 implemented and manually tested
- [ ] NFR1–NFR4 verified
- [ ] TC1–TC6 pass
- [ ] All existing 73 tests still pass
- [ ] Typecheck clean
- [ ] Zero `any` in new code
- [ ] PR ready for review
