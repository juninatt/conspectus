import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'

import { App } from '../App'
import { ThemeProvider } from '../theme/ThemeProvider'

/** Renders the whole app at `path`, with a fresh query cache and no retries. */
export function renderApp(path = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <App />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

/** The current URL's query parameters, as the app has set them. */
export function currentSearch(): URLSearchParams {
  return new URLSearchParams(screen.getByTestId('location').textContent ?? '')
}

function LocationProbe() {
  const location = useLocation()
  return (
    <output data-testid="location" hidden>
      {location.search}
    </output>
  )
}
