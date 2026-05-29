# SDD Proposal: 05-chart-styles

## Problem Statement

The current WPM charts use `sparkline()` from `@crafter/charts`, which renders a single-line inline sparkline (▁▂▃▄▅▆▇█). This is barely visible — one character tall, no axis labels, no color, and gets lost in the terminal output. The @crafter/charts library offers much richer rendering (braille charset with sub-pixel resolution, multi-line area charts, full chart builder with axes, and color support) that we are not using.

## Intended Outcome

Charts that are:
- **Visually prominent** — at least 4–8 lines tall with braille rendering
- **Colored** — WPM line in a visible color (e.g., green or cyan)
- **Contextual** — y-axis labels to show WPM scale
- **Consistent** — same chart style across Results, History, and History Detail screens
- **Still compact** — respect terminal width, don't overwhelm the screen

## Scope

### In Scope

- Replace `sparkline()` with richer chart rendering in `buildWpmChart()`
- Use `chart()` builder with braille charset, y-axis, and color for the multi-point WPM history (Results + History Detail, ~30 points)
- Use `sparkArea()` with height for the trend chart (History screen, ~15 points)
- Add color parameter to `buildWpmChart()` (green for results, cyan for history)
- Update `buildResults()`, `buildHistory()`, `buildHistoryDetail()` to accommodate taller charts
- Ensure downsampling still produces appropriate point counts for the chosen chart style

### Out of Scope

- New chart types (heatmap, gauge, candlestick, scatter — not relevant for WPM data)
- Interactive chart features
- Changing the data pipeline (wpmHistory collection, storage, query)

## Affected Areas

| Area                  | Impact                                                       |
| --------------------- | ------------------------------------------------------------ |
| `src/screens.ts`      | `buildWpmChart()` signature + impl; `buildResults()`, `buildHistory()`, `buildHistoryDetail()` layout adaptation |
| `src/screens.test.ts` | Update tests for new chart output (content checks on chart presence, not exact sparkline chars) |

## Risks and Mitigations

| Risk                                                              | Likelihood | Mitigation                                           |
| ----------------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| Braille charts may not render correctly in all terminals          | Low        | Auto-detect terminal width; braille is standard unicode |
| Taller charts take more vertical space, pushing stats off-screen  | Low        | Keep chart height configurable (4-6 lines)           |
| `chart()` builder produces ANSI codes that break in some contexts | Low        | Use `sparkArea()` as fallback — no ANSI, pure unicode |
| Tests check exact string output, chart changes break them         | Medium     | Change tests to check chart presence, not exact chars |

## Success Criteria

### Functional

1. WPM chart in Results is at least 4 lines tall with visible y-axis
2. WPM trend in History is at least 3 lines tall
3. Charts use color (green for results, cyan for history detail)
4. All existing tests pass, updated for new chart output

### Non-Functional

1. Chart renders in under 5ms (same as current sparkline)
2. No ANSI escape codes leaking into output (or properly handled)
3. Zero type errors
4. Downsampling still limits points to prevent horizontal overflow

## Implementation Plan (Phases)

### Phase 1: Chart Function Upgrade

- Change `buildWpmChart()` to accept options (color, height, style)
- Use `sparkArea()` for trend (fewer points, compact)
- Use `chart()` builder with braille + y-axis for full WPM history

### Phase 2: Screen Adaptations

- Update `buildResults()` to accommodate taller chart (adjust content width calc)
- Update `buildHistory()` trend section for taller chart
- Update `buildHistoryDetail()` for taller chart

### Phase 3: Tests

- Update `buildResults` chart tests to check presence, not exact characters
- Update `buildHistory` / `buildHistoryDetail` similarly
- Verify typecheck and test suite pass

## Rollback Plan

Revert the commit. The old `sparkline()` code can be restored from git history. No data migration needed.
