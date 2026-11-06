import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DatasetResponse } from '../api/client'
import tokensCss from '../styles/tokens.css?raw'
import { currentSearch, renderApp } from '../test/render'
import { apiUrl, server } from '../test/server'
import type { ChartOption } from './echarts'

// ECharts draws on a canvas, which the test environment lacks. The stand-in
// exposes what would be drawn: the description, series names and colors.
vi.mock('./Chart', () => ({
  Chart: ({ option, label }: { option: ChartOption; label: string }) => (
    <div
      role="img"
      aria-label={label}
      data-colors={(option.color as string[]).join(' ')}
    >
      {(option.series as { name: string }[]).map((series) => (
        <span key={series.name}>series: {series.name}</span>
      ))}
    </div>
  ),
}))

const readings: DatasetResponse = {
  id: 'readings',
  name: 'Readings',
  columns: [
    { name: 'recorded', type: 'datetime', nullable: false },
    { name: 'station', type: 'string', nullable: false },
    { name: 'temperature', type: 'number', nullable: false },
    { name: 'humidity', type: 'integer', nullable: false },
  ],
  rows: [
    {
      recorded: '2026-10-01T06:00:00',
      station: 'north',
      temperature: 11.8,
      humidity: 82,
    },
    {
      recorded: '2026-10-01T06:00:00',
      station: 'south',
      temperature: 14,
      humidity: 76,
    },
  ],
  total_rows: 2,
}

function serve(dataset: DatasetResponse) {
  server.use(
    http.get(apiUrl(`/datasets/${dataset.id}`), () =>
      HttpResponse.json(dataset),
    ),
  )
}

const chart = () => screen.findByRole('img')

describe('ChartView', () => {
  beforeEach(() => serve(readings))

  it('switches between table and chart', async () => {
    renderApp('/datasets/readings')
    await userEvent.click(await screen.findByRole('button', { name: 'Chart' }))

    expect(await chart()).toHaveAccessibleName(
      'line chart of temperature by recorded, grouped by station',
    )
    expect(screen.getByRole('button', { name: 'Chart' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(currentSearch().get('view')).toBe('chart')

    await userEvent.click(screen.getByRole('button', { name: 'Table' }))
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('restores the chart from the URL', async () => {
    renderApp('/datasets/readings?view=chart&chart=bar&x=station&y=humidity')

    expect(await chart()).toHaveAccessibleName(
      'bar chart of humidity by station',
    )
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveValue('bar')
  })

  it('falls back to defaults for settings that no longer fit the data', async () => {
    renderApp('/datasets/readings?view=chart&x=removed&y=station')

    expect(await chart()).toHaveAccessibleName(
      'line chart of temperature by recorded, grouped by station',
    )
  })

  it('writes changed settings to the URL', async () => {
    renderApp('/datasets/readings?view=chart')
    await chart()

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'X axis' }),
      'station',
    )
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Type' }),
      'bar',
    )

    expect(await chart()).toHaveAccessibleName(
      'bar chart of temperature by station',
    )
    expect(currentSearch().get('x')).toBe('station')
    expect(currentSearch().get('chart')).toBe('bar')
  })

  it('offers only numeric columns for the y axis', async () => {
    renderApp('/datasets/readings?view=chart')
    await chart()

    const yAxis = screen.getByRole('group', { name: 'Y axis' })
    expect(
      within(yAxis)
        .getAllByRole('checkbox')
        .map((box) => box.parentElement?.textContent),
    ).toEqual(['temperature', 'humidity'])
  })

  it('plots several y columns and keeps at least one selected', async () => {
    renderApp('/datasets/readings?view=chart')
    await chart()
    const temperature = screen.getByRole('checkbox', { name: 'temperature' })

    expect(temperature).toBeDisabled()

    await userEvent.click(screen.getByRole('checkbox', { name: 'humidity' }))

    expect(await screen.findByText('series: humidity')).toBeInTheDocument()
    expect(screen.getByText('series: temperature')).toBeInTheDocument()
    expect(temperature).toBeEnabled()
    expect(currentSearch().getAll('y')).toEqual(['temperature', 'humidity'])
  })

  it('groups a single y column into one series per value', async () => {
    renderApp('/datasets/readings?view=chart')
    await chart()

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Group by' }),
      'station',
    )

    expect(await screen.findByText('series: north')).toBeInTheDocument()
    expect(screen.getByText('series: south')).toBeInTheDocument()
  })

  it('turns off grouping when several y columns are chosen', async () => {
    renderApp('/datasets/readings?view=chart&group=station')
    await chart()

    await userEvent.click(screen.getByRole('checkbox', { name: 'humidity' }))

    const groupBy = screen.getByRole('combobox', { name: 'Group by' })
    expect(groupBy).toBeDisabled()
    expect(groupBy).toHaveValue('')
    expect(currentSearch().get('group')).toBeNull()
  })

  it('says so when more series exist than distinct colors', async () => {
    serve({
      ...readings,
      rows: Array.from({ length: 10 }, (_, index) => ({
        ...readings.rows[0],
        station: `station ${index}`,
      })),
    })

    renderApp('/datasets/readings?view=chart&group=station')

    expect(
      await screen.findByText(/Showing the first 8 series; 2 more/),
    ).toBeInTheDocument()
  })

  it('explains when nothing can be plotted', async () => {
    serve({
      ...readings,
      columns: [{ name: 'station', type: 'string', nullable: false }],
      rows: [{ station: 'north' }],
    })

    renderApp('/datasets/readings?view=chart')

    expect(await screen.findByText('Nothing to chart')).toBeInTheDocument()
  })
})

describe('ChartView theme', () => {
  beforeEach(() => serve(readings))

  it('redraws with the dark palette when the theme changes', async () => {
    const style = document.createElement('style')
    style.textContent = tokensCss
    document.head.append(style)
    renderApp('/datasets/readings?view=chart')
    const firstColor = async () =>
      (await chart()).getAttribute('data-colors')?.split(' ')[0]

    expect(await firstColor()).toBe('#2a78d6')

    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))

    expect(await firstColor()).toBe('#3987e5')
    style.remove()
  })
})
