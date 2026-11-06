import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  readPreference,
  resolveTheme,
  savePreference,
  STORAGE_KEY,
} from './theme'

describe('resolveTheme', () => {
  it.each([
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
  ] as const)(
    'resolves %s with a dark system = %s to %s',
    (preference, dark, expected) => {
      expect(resolveTheme(preference, dark)).toBe(expected)
    },
  )
})

describe('stored preference', () => {
  afterEach(() => vi.restoreAllMocks())

  it('defaults to following the system', () => {
    expect(readPreference()).toBe('system')
  })

  it('reads back a saved preference', () => {
    savePreference('dark')

    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
    expect(readPreference()).toBe('dark')
  })

  it('ignores an unknown stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'sepia')

    expect(readPreference()).toBe('system')
  })

  it('copes with storage being unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(() => savePreference('dark')).not.toThrow()
    expect(readPreference()).toBe('system')
  })
})
