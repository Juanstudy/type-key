# SDD Spec: 05-chart-styles

## Acceptance Criteria

### AC1: Results screen uses chart() with braille
- WPM over time in buildResults() uses `chart()` builder
- Charset: `"braille"`
- Height: 6 lines
- Width: auto (terminal width)
- y-axis with WPM values visible
- Line color: green (`"green"`)
- Label: `"WPM"`

### AC2: History screen trend uses sparkArea()
- WPM trend in buildHistory() uses `sparkArea()`
- Height: 3 lines (compact for history header)
- Width: auto
- Color: cyan (`"cyan"`)
- Background: `" "` (transparent, blends with terminal)

### AC3: History Detail screen uses chart() with braille
- Same chart() builder as Results
- Line color: cyan (`"cyan"`)
- Height: 6 lines
- y-axis visible

### AC4: Downsampling adapts to chart style
- chart() builder: downsample to max 40 points (match terminal width)
- sparkArea(): downsample to max 40 points

### AC5: Tests pass
- All existing tests updated for new chart output
- TypeScript typecheck passes (`bun run typecheck`)
- Test suite passes (`bun run test`)
