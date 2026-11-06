import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { setSystemDark } from '../test/matchMedia'
import { renderApp } from '../test/render'
import { STORAGE_KEY } from './theme'

const shownTheme = () => document.documentElement.dataset.theme
const button = (name: string) => screen.getByRole('button', { name })

describe('ThemeSwitch', () => {
  it('follows the system by default', async () => {
    renderApp('/')

    expect(await screen.findByRole('group', { name: 'Theme' })).toBeVisible()
    expect(button('System')).toHaveAttribute('aria-pressed', 'true')
    expect(shownTheme()).toBe('light')
  })

  it('switches theme and remembers the choice', async () => {
    renderApp('/')

    await userEvent.click(await screen.findByRole('button', { name: 'Dark' }))

    expect(shownTheme()).toBe('dark')
    expect(button('Dark')).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('starts with a previously saved choice', async () => {
    localStorage.setItem(STORAGE_KEY, 'dark')

    renderApp('/')

    expect(await screen.findByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(shownTheme()).toBe('dark')
  })

  it('follows the system live while set to System', async () => {
    renderApp('/')
    await screen.findByRole('group', { name: 'Theme' })

    act(() => setSystemDark(true))
    expect(shownTheme()).toBe('dark')

    act(() => setSystemDark(false))
    expect(shownTheme()).toBe('light')
  })

  it('ignores the system once a theme is chosen', async () => {
    renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Light' }))

    act(() => setSystemDark(true))

    expect(shownTheme()).toBe('light')
  })
})
