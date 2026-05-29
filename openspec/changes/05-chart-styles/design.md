# SDD Design: 05-chart-styles

## Architecture

The change is entirely within `src/screens.ts`. No new files, no data pipeline changes, no new dependencies.

### buildWpmChart() — Refactored

```typescript
// Old API
function buildWpmChart(wpmHistory: number[]): string

// New API — options object for flexibility
function buildWpmChart(
  wpmHistory: number[],
  options?: {
    color?: AnsiColor;
    height?: number;
    style?: "line" | "area";
    showAxis?: boolean;
    label?: string;
  }
): string
```

### Chart Construction

**For full charts (Results, History Detail) — chart() + braille with y-axis:**

```typescript
const c = chart({ width: "auto", height: 6, charset: "braille" })
  .data(dataPoints, { xKey: "i" })
  .yAxis({ format: v => v.toFixed(0) })
  .line({ key: "wpm", color: "green", label: "WPM" });
return renderToAnsi(c);
```

**For trend chart (History summary) — sparkArea() compact:**

```typescript
return sparkArea(wpms, { height: 3, color: "cyan" });
```

### Data Preparation

chart() builder expects `Record<string, number>[]` with an xKey and data keys. We transform:

```typescript
const dataPoints = downsampled.map((wpm, i) => ({ i, wpm }));
```

### Downsampling

Keep current `downsample()` function but adjust max points:

- For chart(): 40 points max (braille chars are half-width, ~80 terminal cells for 40 braille points)
- For sparkArea(): 40 points max
- For sparkline() (fallback): keep 30

### Color Mapping

| Context         | Color    | Chart Type    | Height |
| --------------- | -------- | ------------- | ------ |
| Results         | `"green"` | chart() braille | 6      |
| History Detail  | `"cyan"`  | chart() braille | 6      |
| History trend   | `"cyan"`  | sparkArea()     | 3      |

### Content Width Calculation

The chart rows from `renderToAnsi()` will be wider than the current sparkline. `buildResults()` and `buildHistoryDetail()` use `contentWidth` for the box border; they already compute `Math.max(...lines.map(l => l.length))` so they'll auto-adjust.

## Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| chart() + braille | Sub-pixel resolution, y-axis labels, color, professional look | ANSI escape codes, needs renderToAnsi, more complex data prep |
| sparkArea() | Pure unicode, no ANSI, simple API, height support | No axis labels, less informative |
| plot() | Simple API, supports height/charset | Less control than chart(), no individual line styling |

## Compatibility

- chart() with braille requires a terminal that supports Unicode braille characters (U+2800–U+28FF) — all modern terminals do
- renderToAnsi() outputs ANSI SGR codes — OpenTUI may strip or pass them through
- sparkArea() uses pure Unicode block chars — no ANSI, safe everywhere
