import { describe, expect, it } from 'vitest'

import type { Column, Row } from '../api/client'
import {
  axisKind,
  buildChartModel,
  type ChartSettings,
  defaultSettings,
  groupCandidates,
  MAX_SERIES,
  yCandidates,
} from './chartOptions'
import type { ChartTheme } from './theme'

const theme: ChartTheme = {
  series: ['#111111', '#222222', '#333333'],
  text: '#000000',
  mutedText: '#666666',
  axis: '#cccccc',
  grid: '#eeeeee',
  surface: '#ffffff',
}

const columns: Column[] = [
  { name: 'recorded', type: 'datetime', nullable: false },
  { name: 'station', type: 'string', nullable: false },
  { name: 'temperature', type: 'number', nullable: true },
  { name: 'humidity', type: 'integer', nullable: false },
  { name: 'calibrated', type: 'boolean', nullable: false },
]

const rows: Row[] = [
  {
    recorded: '2026-10-01T09:00:00',
    station: 'north',
    temperature: 12.4,
    humidity: 80,
    calibrated: true,
  },
  {
    recorded: '2026-10-01T06:00:00',
    station: 'south',
    temperature: null,
    humidity: 76,
    calibrated: false,
  },
  {
    recorded: '2026-10-01T06:00:00',
    station: 'north',
    temperature: 11.8,
    humidity: 82,
    calibrated: true,
  },
]

const line: ChartSettings = {
  type: 'line',
  x: 'recorded',
  y: ['temperature'],
  group: null,
}

function model(settings: Partial<ChartSettings>, data: Row[] = rows) {
  return buildChartModel(columns, data, { ...line, ...settings }, theme)
}

// The option's union types are wide; tests only read plain values from it.
function seriesOf(settings: Partial<ChartSettings>, data?: Row[]) {
  return model(settings, data).option.series as {
    type: string
    name: string
    data: [string | number, number | null][]
  }[]
}

function xAxisOf(settings: Partial<ChartSettings>) {
  return model(settings).option.xAxis as { type: string; data?: string[] }
}

describe('column rules', () => {
  it.each([
    ['date', 'time'],
    ['datetime', 'time'],
    ['integer', 'value'],
    ['number', 'value'],
    ['string', 'category'],
    ['boolean', 'category'],
  ] as const)('puts %s columns on a %s axis', (type, kind) => {
    expect(axisKind(type)).toBe(kind)
  })

  it('only offers numeric columns for the y axis', () => {
    expect(yCandidates(columns).map((column) => column.name)).toEqual([
      'temperature',
      'humidity',
    ])
  })

  it('only offers text and boolean columns for grouping', () => {
    expect(groupCandidates(columns).map((column) => column.name)).toEqual([
      'station',
      'calibrated',
    ])
  })
})

describe('defaultSettings', () => {
  const uniqueTimes = rows.map((row, index) => ({
    ...row,
    recorded: `2026-10-0${index + 1}T06:00:00`,
  }))

  it('starts with a line over time when there is a date column', () => {
    expect(defaultSettings(columns, uniqueTimes)).toEqual({
      type: 'line',
      x: 'recorded',
      y: ['temperature'],
      group: null,
    })
  })

  it('groups by the first text column when x values repeat', () => {
    // Two rows share 06:00, so one line would zigzag between stations.
    expect(defaultSettings(columns, rows)?.group).toBe('station')
  })

  it('starts with ungrouped bars when there is no date column', () => {
    const noDates = columns.filter((column) => column.name !== 'recorded')

    expect(defaultSettings(noDates, rows)).toEqual({
      type: 'bar',
      x: 'station',
      y: ['temperature'],
      group: null,
    })
  })

  it('returns null when nothing can be plotted', () => {
    expect(
      defaultSettings(
        [{ name: 'station', type: 'string', nullable: false }],
        [],
      ),
    ).toBeNull()
  })
})

describe('buildChartModel', () => {
  it('sorts rows by a time axis so lines run left to right', () => {
    const [series] = seriesOf({})

    expect(series?.data.map(([x]) => x)).toEqual([
      '2026-10-01T06:00:00',
      '2026-10-01T06:00:00',
      '2026-10-01T09:00:00',
    ])
  })

  it('keeps missing y values as gaps', () => {
    const [series] = seriesOf({})

    expect(series?.data.map(([, y]) => y)).toContain(null)
  })

  it('draws one series per y column', () => {
    const series = seriesOf({ y: ['temperature', 'humidity'] })

    expect(series.map((item) => item.name)).toEqual(['temperature', 'humidity'])
  })

  it('draws one series per group, in order of appearance in the data', () => {
    const series = seriesOf({ group: 'station' })

    expect(series.map((item) => item.name)).toEqual(['north', 'south'])
    expect(series[0]?.data).toHaveLength(2)
  })

  it('keeps each group on the same color slot whatever the x axis', () => {
    const names = (settings: Partial<ChartSettings>) =>
      seriesOf({ group: 'station', ...settings }).map((item) => item.name)

    // Sorting by humidity puts south first, but the order must not follow.
    expect(names({ type: 'scatter', x: 'humidity' })).toEqual(names({}))
  })

  it('puts bars over dates on a category axis, in date order', () => {
    const axis = xAxisOf({ type: 'bar' })

    expect(axis.type).toBe('category')
    expect(axis.data).toEqual(['2026-10-01T06:00:00', '2026-10-01T09:00:00'])
  })

  it('ignores grouping when several y columns are chosen', () => {
    const series = seriesOf({
      y: ['temperature', 'humidity'],
      group: 'station',
    })

    expect(series.map((item) => item.name)).toEqual(['temperature', 'humidity'])
  })

  it('uses category labels, in order of appearance, for text on x', () => {
    const axis = xAxisOf({ type: 'bar', x: 'station' })

    expect(axis.type).toBe('category')
    expect(axis.data).toEqual(['north', 'south'])
  })

  it('leaves out series beyond the number of distinct colors', () => {
    const many: Row[] = Array.from({ length: MAX_SERIES + 2 }, (_, index) => ({
      ...rows[0],
      station: `s${index}`,
    }))

    const result = model({ group: 'station' }, many)

    expect(result.omittedSeries).toBe(2)
    expect(result.option.series).toHaveLength(MAX_SERIES)
  })

  it('shows a legend only when there are several series', () => {
    const legend = (settings: Partial<ChartSettings>) =>
      model(settings).option.legend as { show?: boolean }

    expect(legend({}).show).toBe(false)
    expect(legend({ group: 'station' }).show).not.toBe(false)
  })

  it('offers zoom on continuous axes but not on categories', () => {
    expect(model({}).option.dataZoom).toHaveLength(2)
    expect(model({ type: 'bar', x: 'station' }).option.dataZoom).toEqual([])
  })

  it('colors series from the theme', () => {
    expect(model({}).option.color).toEqual(theme.series)
  })

  it('skips rows without an x value', () => {
    const withGap: Row[] = [...rows, { ...rows[0], recorded: null }]

    expect(seriesOf({}, withGap)[0]?.data).toHaveLength(3)
  })
})

describe('zoom', () => {
  it('applies a zoom range to both zoom controls', () => {
    const result = buildChartModel(columns, rows, line, theme, {
      start: 20,
      end: 60,
    })

    expect(result.option.dataZoom).toEqual([
      expect.objectContaining({ type: 'inside', start: 20, end: 60 }),
      expect.objectContaining({ type: 'slider', start: 20, end: 60 }),
    ])
  })
})

describe('y axis range', () => {
  const scale = (type: ChartSettings['type']) =>
    (model({ type }).option.yAxis as { scale: boolean }).scale

  it('starts bars at zero, since bar length encodes the value', () => {
    expect(scale('bar')).toBe(false)
  })

  it('fits lines and points to the data, the same for both', () => {
    expect(scale('line')).toBe(true)
    expect(scale('scatter')).toBe(true)
  })
})
