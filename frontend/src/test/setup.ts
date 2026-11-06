import '@testing-library/jest-dom/vitest'

import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { installMatchMedia, resetMatchMedia } from './matchMedia'
import { server } from './server'

// The default 1 s wait for elements is too tight for the first test in a
// file on a busy machine, where the environment is still warming up.
configure({ asyncUtilTimeout: 4000 })

installMatchMedia()

// Any request without a handler fails the test instead of hitting a network.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetMatchMedia()
  localStorage.clear()
  delete document.documentElement.dataset.theme
})
afterAll(() => server.close())
