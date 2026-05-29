# SDD Tasks: 05-chart-styles

## Task List

### Task 1: Update buildWpmChart() signature and chart() implementation

**Files:** `src/screens.ts`

**Actions:**
- Change `buildWpmChart(wpmHistory: number[])` to accept an options parameter
- Import `chart, renderToAnsi` from `@crafter/charts`
- For full chart (default): transform data to `{i, wpm}[]`, call `chart({ width: 'auto', height: 6, charset: 'braille' }).data(...).yAxis({format: v=>v.toFixed(0)}).line(...)` then `renderToAnsi()`
- For area chart: use `sparkArea(wpms, { height: 3, color })` (already imported)

**Acceptance:** Function compiles and returns a non-empty string for valid input.

### Task 2: Update buildResults() to use new chart

**Files:** `src/screens.ts`

**Actions:**
- Change `buildWpmChart(wpmHistory)` call to `buildWpmChart(wpmHistory, { color: 'green', height: 6, label: 'WPM' })`
- Verify chart lines integrate into the results box layout

**Acceptance:** Results screen shows a 6-line braille chart with y-axis and green line.

### Task 3: Update buildHistory() trend chart

**Files:** `src/screens.ts`

**Actions:**
- Change trend chart call to `buildWpmChart(recentWpms, { color: 'cyan', height: 3, style: 'area' })`
- Verify it produces a compact area chart

**Acceptance:** History screen trend shows a 3-line cyan area chart.

### Task 4: Update buildHistoryDetail() chart

**Files:** `src/screens.ts`

**Actions:**
- Change to `buildWpmChart(wpmHistory, { color: 'cyan', height: 6, label: 'WPM' })`
- Same chart() style as results but cyan

**Acceptance:** History detail shows a 6-line braille chart in cyan.

### Task 5: Update tests

**Files:** `src/screens.test.ts`

**Actions:**
- Update chart presence checks: instead of checking exact string, check that output contains chart indicators (braille chars, axis chars, "WPM" label)
- Keep all stat checks intact
- Add a test for chart with color option

**Acceptance:** All 115 tests pass.
