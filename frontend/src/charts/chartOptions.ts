/**
 * Turns a dataset and the user's chart settings into an ECharts option.
 * Pure functions only, so every rule can be tested without rendering.
 */
import type { Column, ColumnType, Row, Value } from '../api/client'
import type { ChartOption, ZoomRange } from './echarts'
import type { ChartTheme } from './theme'

export const CHART_TYPES = ['line', 'bar', 'scatter'] as const
export type ChartType = (typeof CHART_TYPES)[number]

export type ChartSettings = {
  type: ChartType
  /** Column on the x axis. */
  x: string
  /** One or more numeric columns, each drawn as a series. */
  y: string[]
  /** Splits a single y column into one series per value of this column. */
  group: string | null
}

export type AxisKind = 'time' | 'value' | 'category'

export type ChartModel = {
  option: ChartOption
  /** Series left out because the palette has no more distinct colors. */
  omittedSeries: number
}

/** Series beyond this would need a repeated color, so they are left out. */
export const MAX_SERIES = 8

const NUMERIC: ColumnType[] = ['integer', 'number']
const GROUPABLE: ColumnType[] = ['string', 'boolean']

export function axisKind(type: ColumnType): AxisKind {
  if (type === 'date' || type === 'datetime') return 'time'
  if (NUMERIC.includes(type)) return 'value'
  return 'category'
}

/** Any column can go on the x axis; its type decides the axis kind. */
export const xCandidates = (columns: Column[]) => columns

/** Only numeric columns can be plotted on the y axis. */
export const yCandidates = (columns: Column[]) =>
  columns.filter((column) => NUMERIC.includes(column.type))

/** Text and boolean columns, other than the x column, can split a series. */
export const groupCandidates = (columns: Column[], x?: string) =>
  columns.filter(
    (column) => GROUPABLE.includes(column.type) && column.name !== x,
  )

/**
 * A sensible first chart: time on x if there is a date column, the first
 * numeric column on y, a line over time and bars otherwise. When x values
 * repeat – e.g. several stations measured at the same time – the rows are
 * grouped by the first text or boolean column, so each group gets its own
 * series instead of one line zigzagging between them. Null when the dataset
 * has nothing numeric to plot.
 */
export function defaultSettings(
  columns: Column[],
  rows: Row[],
): ChartSettings | null {
  const y = yCandidates(columns)[0]
  if (y === undefined) return null
  const x =
    columns.find((column) => axisKind(column.type) === 'time') ??
    columns.find((column) => column.name !== y.name) ??
    y
  const kind = axisKind(x.type)
  const xValues = rows.map((row) => row[x.name])
  const repeats = new Set(xValues).size < xValues.length
  const group = groupCandidates(columns, x.name)[0]
  // Categories already show each x value once; only lines need splitting.
  const autoGroup = repeats && kind !== 'category' && group !== undefined
  return {
    type: kind === 'time' ? 'line' : 'bar',
    x: x.name,
    y: [y.name],
    group: autoGroup ? group.name : null,
  }
}

export function buildChartModel(
  columns: Column[],
  rows: Row[],
  settings: ChartSettings,
  theme: ChartTheme,
  zoom: ZoomRange = { start: 0, end: 100 },
): ChartModel {
  const xColumn = columns.find((column) => column.name === settings.x)
  const xKind = xColumn === undefined ? 'category' : axisKind(xColumn.type)
  // Bars over dates read best with one labelled slot per date rather than
  // bars floating on a continuous time scale.
  const kind: AxisKind =
    settings.type === 'bar' && xKind === 'time' ? 'category' : xKind
  const plotted = sortByX(
    rows.filter((row) => row[settings.x] != null),
    settings.x,
    xKind,
  )

  const allSeries = buildSeries(plotted, settings, rows)
  const series = allSeries.slice(0, MAX_SERIES)
  const showLegend = series.length > 1
  const axisLabel = { color: theme.mutedText }
  const axisLine = { lineStyle: { color: theme.axis } }

  const option: ChartOption = {
    color: theme.series,
    textStyle: { color: theme.text },
    grid: {
      left: 16,
      right: 24,
      top: showLegend ? 48 : 24,
      bottom: kind === 'category' ? 24 : 72,
      containLabel: true,
    },
    legend: showLegend
      ? { top: 0, icon: 'roundRect', textStyle: { color: theme.text } }
      : { show: false },
    tooltip: {
      backgroundColor: theme.surface,
      borderColor: theme.axis,
      textStyle: { color: theme.text },
      ...(settings.type === 'scatter'
        ? { trigger: 'item' }
        : {
            trigger: 'axis',
            axisPointer: { type: settings.type === 'bar' ? 'shadow' : 'line' },
          }),
    },
    xAxis: {
      type: kind,
      name: settings.x,
      nameLocation: 'middle',
      nameGap: 32,
      nameTextStyle: { color: theme.mutedText },
      axisLabel,
      axisLine,
      // Scatter plots and value axes need not start at zero.
      scale: kind === 'value',
      ...(kind === 'category' && {
        data: uniqueInOrder(plotted.map((row) => display(row[settings.x]))),
      }),
    },
    yAxis: {
      type: 'value',
      name: settings.y.length === 1 ? settings.y[0] : undefined,
      // Left-aligned from the axis, so long names are not cut off.
      nameTextStyle: { color: theme.mutedText, align: 'left' },
      axisLabel,
      splitLine: { lineStyle: { color: theme.grid } },
      // Bars encode values as lengths, so they must start at zero; lines and
      // points show position and fit the data's range.
      scale: settings.type !== 'bar',
    },
    // Zooming only makes sense on continuous axes.
    dataZoom:
      kind === 'category'
        ? []
        : [
            { type: 'inside', ...zoom },
            {
              type: 'slider',
              ...zoom,
              bottom: 8,
              height: 20,
              borderColor: theme.axis,
            },
          ],
    series: series.map(({ name, data }) =>
      seriesOption(settings.type, name, data),
    ),
  }

  return { option, omittedSeries: allSeries.length - series.length }
}

type Point = [string | number, number | null]
type SeriesData = { name: string; data: Point[] }

function buildSeries(
  rows: Row[],
  settings: ChartSettings,
  originalRows: Row[],
): SeriesData[] {
  const point = (row: Row, column: string): Point => [
    xValue(row[settings.x]),
    numeric(row[column]),
  ]
  const [onlyY] = settings.y
  if (settings.group !== null && settings.y.length === 1 && onlyY) {
    const group = settings.group
    // Groups are ordered – and so colored – by first appearance in the data,
    // not in the sorted rows, so a group keeps its color in every chart.
    const groups = new Map<string, Point[]>(
      uniqueInOrder(originalRows.map((row) => display(row[group]))).map(
        (name) => [name, []],
      ),
    )
    for (const row of rows) {
      const key = display(row[group])
      groups.set(key, [...(groups.get(key) ?? []), point(row, onlyY)])
    }
    return [...groups]
      .filter(([, data]) => data.length > 0)
      .map(([name, data]) => ({ name, data }))
  }
  return settings.y.map((column) => ({
    name: column,
    data: rows.map((row) => point(row, column)),
  }))
}

function seriesOption(type: ChartType, name: string, data: Point[]) {
  switch (type) {
    case 'line':
      return {
        type,
        name,
        data,
        lineStyle: { width: 2 },
        // Filled markers: the default hollow ones have a white center that
        // stands out on a dark background.
        symbol: 'circle',
        symbolSize: 8,
        // Markers on every point clutter long series.
        showSymbol: data.length <= 50,
      }
    case 'bar':
      return { type, name, data, itemStyle: { borderRadius: [4, 4, 0, 0] } }
    case 'scatter':
      // Opaque, so a series has exactly the same color as in a line chart.
      return { type, name, data, symbolSize: 8, itemStyle: { opacity: 1 } }
  }
}

function sortByX(rows: Row[], x: string, kind: AxisKind): Row[] {
  // Categories keep the order they appear in; time and numbers are sorted
  // so lines are drawn left to right. ISO dates sort correctly as text.
  if (kind === 'category') return rows
  return [...rows].sort((a, b) => compare(a[x], b[x]))
}

function compare(a: Value | undefined, b: Value | undefined): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

function xValue(value: Value | undefined): string | number {
  return typeof value === 'number' ? value : display(value)
}

function numeric(value: Value | undefined): number | null {
  return typeof value === 'number' ? value : null
}

function display(value: Value | undefined): string {
  return value === null || value === undefined ? '(empty)' : String(value)
}

function uniqueInOrder(values: string[]): string[] {
  return [...new Set(values)]
}
