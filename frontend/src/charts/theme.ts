/** Colors a chart needs, taken from the design tokens. */
export type ChartTheme = {
  series: string[]
  text: string
  mutedText: string
  axis: string
  grid: string
  surface: string
}

const SERIES_SLOTS = 8

/**
 * Reads the chart colors from the CSS variables in tokens.css, so charts
 * follow the active theme instead of hard-coding colors.
 */
export function readChartTheme(element: Element = document.documentElement) {
  const styles = getComputedStyle(element)
  const token = (name: string) => styles.getPropertyValue(name).trim()
  return {
    series: Array.from({ length: SERIES_SLOTS }, (_, index) =>
      token(`--chart-series-${index + 1}`),
    ),
    text: token('--color-text'),
    mutedText: token('--color-text-muted'),
    axis: token('--color-border'),
    grid: token('--chart-grid'),
    surface: token('--color-surface'),
  } satisfies ChartTheme
}
