import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { renderApp } from '../test/render'
import { apiUrl, server } from '../test/server'

describe('SourcesPage', () => {
  it('lists every source with a link to its data', async () => {
    renderApp('/')

    const link = await screen.findByRole('link', { name: /Weather stations/ })
    expect(link).toHaveAttribute('href', '/datasets/weather-stations')
    expect(link).toHaveTextContent('Hourly readings')
    expect(
      screen.getByRole('link', { name: /Daily averages/ }),
    ).toHaveTextContent('sqlite')
  })

  it('opens a dataset when a source is clicked', async () => {
    renderApp('/')

    await userEvent.click(
      await screen.findByRole('link', { name: /Weather stations/ }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Weather stations' }),
    ).toBeInTheDocument()
  })

  it('explains how to add sources when none are configured', async () => {
    server.use(http.get(apiUrl('/sources'), () => HttpResponse.json([])))

    renderApp('/')

    expect(await screen.findByText('No sources configured')).toBeInTheDocument()
  })

  it('shows an error when sources cannot be loaded', async () => {
    server.use(
      http.get(apiUrl('/sources'), () =>
        HttpResponse.json({ detail: 'Backend exploded' }, { status: 500 }),
      ),
    )

    renderApp('/')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not load sources')
    expect(alert).toHaveTextContent('Backend exploded')
  })
})
