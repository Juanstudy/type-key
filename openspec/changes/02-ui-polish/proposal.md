# SDD Proposal: 02-ui-polish

## Problem Statement

The current type-key interface uses plain text dumped via a single `Text` element. There is no visual structure, no centering, no colors, no borders — the app feels like a raw terminal log rather than a polished TUI application. OpenTUI provides Box layouts, flexbox, styled text, ASCII art fonts, and scrollable containers that we are not using.

## Intended Outcome

A centered, visually structured interface with:

- A **dashboard** layout (Box with borders + title)
- **Centered** content vertically and horizontally
- **Colored text**: correct words in green, errors in red, extras highlighted
- A **menu screen** with visual hierarchy
- A **game screen** with a clean header (timer, WPM) and well-spaced word display
- A **results screen** with structured stats

## Scope

### In Scope

- Restructure `show()` to render into a centered Box layout
- Add flex layout to root renderer (centering)
- Colorize typing output using `@opentui/core` styled text API
- Refactor screen builder functions to produce styled content (StyledText/TextChunk)
- Dashboard frame (border, title, optional ASCII art header)
- Menu with visual structure (options in a Box, indicator)
- Results with border and structured layout
- Tests for styled output

### Out of Scope

- New game modes (Words, Quotes — those are separate SDD changes)
- Database/history screen
- Themes system
- Leaderboards
- Multi-language support

## Affected Areas

| Area                  | Impact                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `src/screens.ts`      | All builder functions: return StyledText instead of string                                       |
| `src/index.ts`        | `show()`: add Box root, layout; `showGame()`/`goMenu()`/`goResults()`: adapt to new return types |
| `src/lib/types.ts`    | May need additional type exports                                                                 |
| `src/screens.test.ts` | Update tests for StyledText output                                                               |

## Risks and Mitigations

| Risk                                                            | Likelihood | Mitigation                                                               |
| --------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| OpenTUI Box layout breaks centering in different terminal sizes | Low        | Use flexbox with `justifyContent: center`, test in small/large terminals |
| StyledText API changes between renders                          | Low        | Keep Text element, update content property                               |
| ASCIIFont rendering slows down initial render                   | Low        | Load ASCII font only on menu screen                                      |
| Tests need restructuring for styled output                      | Medium     | Test content strings via `StyledText.chunks`                             |
| Layout shifts between screens                                   | Low        | Use consistent Box dimensions across screens                             |

## Success Criteria

### Functional

1. Menu is centered both vertically and horizontally
2. Correct characters show in green, incorrect in red, extras in red/underline
3. Game screen has a visible header with timer and WPM
4. Results screen has a border and structured layout
5. All existing tests still pass

### Non-Functional

1. No noticeable lag on keypress (render under 16ms)
2. Layout adapts to terminal resize
3. Zero `any` types in new code
4. > 80% test coverage on screen builder functions

## Implementation Plan (Phases)

### Phase 1: Layout Infrastructure

- Add Box/centering to root renderer
- Refactor `show()` to use a Box container
- Test layout

### Phase 2: Styled Screens

- Convert builder functions to return `StyledText`
- Add colors for letter states (correct/incorrect/extra)
- Refactor menu with visual structure

### Phase 3: Visual Polish

- Add ASCII art title on menu
- Add borders to results
- Polish spacing and alignment

## Rollback Plan

Revert the commit and restore the plain-text `show()` function. The current `screens.ts` API returns plain strings, so the rollback is straightforward.
