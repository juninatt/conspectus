import { describe, expect, it } from 'vitest'

import type { Column, Row } from '../api/client'
import { readChartSettings, writeChartSettings } from './urlSettings'

const columns: Column[] = [
  { name: 'recorded', type: 'datetime', nullable: false },
  { name: 'station', type: 'string', nullable: false },
  { name: 'temperature', type: 'number', nullable: true },
  { name: 'humidity', type: 'integer', nullable: false },
]

// Two stations measured at the same time, so the default groups by station.
const rows: Row[] = [
  {
    recorded: '2026-10-01T06:00:00',
    station: 'north',
    temperature: 1,
    humidity: 2,
  },
  {
    recorded: '2026-10-01T06:00:00',
    station: 'south',
    temperature: 3,
    humidity: 4,
  },
]

const read = (query: string) =>
  readChartSettings(new URLSearchParams(query), columns, rows)

describe('readChartSettings', () => {
  it('uses the defaults when the URL has no settings', () => {
    expect(read('')).toEqual({
      type: 'line',
      x: 'recorded',
      y: ['temperature'],
      group: 'station',
    })
  })

  it('keeps "no grouping" once the chart has been adjusted', () => {
    expect(read('chart=line&x=recorded&y=temperature')?.group).toBeNull()
  })

  it('reads every setting', () => {
    expect(read('chart=bar&x=recorded&y=humidity&group=station')).toEqual({
      type: 'bar',
      x: 'recorded',
      y: ['humidity'],
      group: 'station',
    })
  })

  it('reads several y columns in order', () => {
    expect(read('y=humidity&y=temperature')?.y).toEqual([
      'humidity',
      'temperature',
    ])
  })

  it.each([
    ['an unknown chart type', 'chart=pie', { type: 'line' }],
    ['a missing x column', 'x=gone', { x: 'recorded' }],
    ['a non-numeric y column', 'y=station', { y: ['temperature'] }],
    [
      'a non-groupable group column',
      'chart=line&group=humidity',
      { group: null },
    ],
  ])('falls back to the default for %s', (_, query, expected) => {
    expect(read(query)).toMatchObject(expected)
  })

  it('keeps the valid y columns and drops the rest', () => {
    expect(read('y=gone&y=humidity&y=humidity')?.y).toEqual(['humidity'])
  })

  it('drops grouping when several y columns are chosen', () => {
    expect(read('y=temperature&y=humidity&group=station')?.group).toBeNull()
  })

  it('returns null when nothing can be plotted', () => {
    const textOnly: Column[] = [
      { name: 'station', type: 'string', nullable: false },
    ]

    expect(readChartSettings(new URLSearchParams(), textOnly, [])).toBeNull()
  })
})

describe('writeChartSettings', () => {
  it('writes settings and keeps unrelated parameters', () => {
    const params = writeChartSettings(new URLSearchParams('view=chart&x=old'), {
      type: 'scatter',
      x: 'temperature',
      y: ['humidity', 'temperature'],
      group: null,
    })

    expect(params.toString()).toBe(
      'view=chart&chart=scatter&x=temperature&y=humidity&y=temperature',
    )
  })

  it('round-trips through readChartSettings', () => {
    const settings = {
      type: 'bar' as const,
      x: 'recorded',
      y: ['humidity'],
      group: 'station',
    }

    expect(
      readChartSettings(
        writeChartSettings(new URLSearchParams(), settings),
        columns,
        rows,
      ),
    ).toEqual(settings)
  })
})

it('never groups by the x column', () => {
  expect(read('chart=bar&x=station&group=station')?.group).toBeNull()
})
