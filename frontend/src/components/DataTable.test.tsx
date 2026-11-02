import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { Column, Row } from '../api/client'
import { DataTable } from './DataTable'

const columns: Column[] = [
  { name: 'station', type: 'string', nullable: false },
  { name: 'temperature', type: 'number', nullable: true },
  { name: 'recorded', type: 'datetime', nullable: false },
]

const rows: Row[] = [
  { station: 'north', temperature: 12.5, recorded: '2026-10-01T08:00:00' },
  { station: 'south', temperature: null, recorded: '2026-10-01T09:00:00' },
  { station: 'east', temperature: 9.75, recorded: '2026-10-01T10:00:00' },
]

function columnValues(name: string): string[] {
  const headers = screen.getAllByRole('columnheader')
  const index = headers.findIndex((header) =>
    header.textContent?.includes(name),
  )
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[index]?.textContent ?? '')
}

function manyRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    station: `s${index + 1}`,
    temperature: index,
    recorded: '2026-10-01T08:00:00',
  }))
}

describe('DataTable', () => {
  it('shows each column with its type', () => {
    render(<DataTable columns={columns} rows={rows} />)

    const headers = screen.getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual([
      'stationstring',
      'temperaturenumber',
      'recordeddatetime',
    ])
  })

  it('formats date-times and marks missing values', () => {
    render(<DataTable columns={columns} rows={rows} />)

    expect(columnValues('recorded')[0]).toBe('2026-10-01 08:00:00')
    expect(columnValues('temperature')[1]).toBe('—')
  })

  it('sorts ascending, then descending, keeping missing values last', async () => {
    render(<DataTable columns={columns} rows={rows} />)
    const header = screen.getByRole('columnheader', { name: /temperature/ })

    await userEvent.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    expect(columnValues('temperature')).toEqual(['9.75', '12.5', '—'])

    await userEvent.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'descending')
    expect(columnValues('temperature')).toEqual(['12.5', '9.75', '—'])
  })

  it('sorts text columns alphabetically', async () => {
    render(<DataTable columns={columns} rows={rows} />)

    await userEvent.click(
      within(screen.getByRole('columnheader', { name: /station/ })).getByRole(
        'button',
      ),
    )

    expect(columnValues('station')).toEqual(['east', 'north', 'south'])
  })

  it('pages through rows', async () => {
    render(<DataTable columns={columns} rows={manyRows(60)} />)

    expect(screen.getByText('Rows 1–25 of 60')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Rows 26–50 of 60')).toBeInTheDocument()
    expect(columnValues('station')[0]).toBe('s26')

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Rows 51–60 of 60')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('changes the page size', async () => {
    render(<DataTable columns={columns} rows={manyRows(60)} />)

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Rows per page' }),
      '50',
    )

    expect(screen.getByText('Rows 1–50 of 60')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(51)
  })

  it('says so when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} />)

    expect(screen.getByText('No rows.')).toBeInTheDocument()
    expect(screen.getByText('Rows 0–0 of 0')).toBeInTheDocument()
  })
})
