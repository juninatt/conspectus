import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { renderApp } from '../test/render'
import { apiUrl, server } from '../test/server'

describe('DatasetPage', () => {
  it('shows the dataset name, size and table', async () => {
    renderApp('/datasets/weather-stations')

    expect(
      await screen.findByRole('heading', { name: 'Weather stations' }),
    ).toBeInTheDocument()
    expect(screen.getByText('3 rows · 3 columns')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(3)
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  it('explains a source that does not exist', async () => {
    server.use(
      http.get(apiUrl('/datasets/nope'), () =>
        HttpResponse.json(
          { detail: "No source with id 'nope'." },
          { status: 404 },
        ),
      ),
    )

    renderApp('/datasets/nope')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Source not found')
    expect(alert).toHaveTextContent("No source with id 'nope'.")
  })

  it('shows why a source cannot be read', async () => {
    server.use(
      http.get(apiUrl('/datasets/broken'), () =>
        HttpResponse.json(
          { detail: 'Invalid JSON in data.json at line 1, column 3' },
          { status: 422 },
        ),
      ),
    )

    renderApp('/datasets/broken')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('This source cannot be read')
    expect(within(alert).getByText(/Invalid JSON in data.json/)).toBeVisible()
  })

  it('links back to all sources', async () => {
    renderApp('/datasets/weather-stations')

    expect(
      await screen.findByRole('link', { name: '← All sources' }),
    ).toHaveAttribute('href', '/')
  })
})
