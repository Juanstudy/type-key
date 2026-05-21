# SDD Design: 02-ui-polish

## Architecture Overview

Replace the single `Text` element approach with a **Box-based layout tree**:

```
RootRenderable (flexbox, center)
  └── Box (fixed max-width 80, centered)
       ├── Title / Header content
       └── Screen content (menu / game / results)
```

The `show()` function will update the inner content of the Box rather than
recreating the entire tree.

## Key Decisions

### KD1: Box + Flex Layout instead of raw Text

**Decision:** Use `BoxRenderable` with `justifyContent: center` and
`alignItems: center` on the root, and a child Box with `maxWidth: 80` for
content.

**Rationale:** OpenTUI's RootRenderable supports flexbox. By setting flex
centering on root, all content auto-centers regardless of terminal size. A
max-width Box prevents lines from spanning the full terminal width (hard to
read).

**Tradeoff:** Adds one layout level. Marginal render cost.

### KD2: StyledText instead of plain string

**Decision:** Screen builder functions return `StyledText` (from
`@opentui/core`) instead of `string`. The `show()` function updates the
Text element's `content` property with StyledText directly.

**Rationale:** `StyledText` supports colored `TextChunk[]` with per-chunk
foreground/background colors. This is the idiomatic OpenTUI way to add
colors.

**Tradeoff:** Builder functions become more complex. But tests can verify
chunk structure.

### KD3: StyledText from chunk arrays, not stringToStyledText

**Decision:** Build colored output using `fg(color)(text)` helper functions
from `@opentui/core` rather than parsing strings.

**Rationale:** `fg(color)` returns `TextChunk` with the color attached.
Composing chunks into `StyledText(chunks)` is the most direct path to
colored output without string parsing.

### KD4: Single Text element reused across screens

**Decision:** Keep one `Text` element inside the content Box. On each
`show()` call, update `.content` with new `StyledText`. Do NOT remove +
recreate.

**Rationale:** We already proved remove+recreate was broken before. Since
`TextRenderable` supports `.content` setter accepting `StyledText`, we can
update in place.

**Risk:** The original code commented "Text.content setter doesn't work via
VNode proxy". But since we're now using the materialized renderable (not
a VNode), the content setter should work. Verified against OpenTUI types.

### KD5: ASCII art title only on menu

**Decision:** Use `ASCIIFontRenderable` for the "Monkeyterm" title on the
menu screen only. Game and results screens use plain text headers.

**Rationale:** ASCII art takes many rows. On the game/results screens we
need the space for content. The menu is the natural place for a splash.

### KD6: Box with border on results, not on game

**Decision:** Results screen gets a bordered Box with title "Results". Menu
and game screens use borderless boxes.

**Rationale:** Results is a static summary — a border frames it nicely. The
game screen needs every row for typing content. The menu can optionally have
a border in Phase 3.

## Component Responsibilities

### `src/screens.ts`

| Function         | Returns       | Description                             |
| ---------------- | ------------- | --------------------------------------- |
| `buildMenu()`    | `StyledText`  | Colored menu with ASCII title + options |
| `buildGame()`    | `StyledText`  | Game screen with colored letters        |
| `buildResults()` | `StyledText`  | Results screen with border              |
| `wordText()`     | `TextChunk[]` | Single word as colored chunks           |
| `shuffleWords()` | `string[]`    | Word selection (unchanged)              |

### `src/index.ts`

| Function      | Change                                                         |
| ------------- | -------------------------------------------------------------- |
| `show()`      | Accept `StyledText`, update Text.content instead of remove+add |
| `goMenu()`    | Add ASCIIFont renderable when entering menu                    |
| `showGame()`  | Unchanged logic, passes to `show()`                            |
| `goResults()` | Unchanged logic, passes to `show()`                            |
| `main()`      | Set up Box layout on root renderer                             |

## Data Flow

```
User keypress
  → handleKey()
    → goGame() / goResults() / goMenu()
      → buildGame() / buildResults() / buildMenu()
        → returns StyledText (colored)
      → show(styledText)
        → textElement.content = styledText
        → renderer.requestRender()
```

## Performance Considerations

- **StyledText creation** happens on every `show()` call (250ms ticks).
  `TextChunk[]` allocation is fast. No string concatenation.
- **Box layout** is computed by Yoga (OpenTUI's layout engine). Negligible
  cost.
- **ASCIIFont** is only created once and reused. Text update is cheap.
- **Rendering** is incremental — OpenTUI only redraws changed cells.

## Testing Strategy

### Unit tests (`src/screens.test.ts`)

- `wordText()` returns correct `TextChunk[]` with right colors for each
  letter state
- `buildMenu()` returns StyledText with ASCII art fragment
- `buildResults()` returns StyledText with label-value pairs

### Integration tests

- Manual: visual verification of centering, colors, layout
- Existing 73 tests must still pass

## Files Changed

| File                  | Change                                                   |
| --------------------- | -------------------------------------------------------- |
| `src/screens.ts`      | Builder functions return `StyledText`, use `fg()` colors |
| `src/screens.test.ts` | Update assertions for StyledText chunks                  |
| `src/index.ts`        | Box layout in `main()`, `show()` uses content setter     |
| `src/lib/types.ts`    | No changes expected                                      |
