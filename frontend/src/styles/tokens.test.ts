import { describe, expect, it } from 'vitest'

import tokensCss from './tokens.css?raw'

/** Reads the `--name: #hex` declarations of the block for `selector`. */
function tokens(selector: string): Record<string, string> {
  const start = tokensCss.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No block for ${selector}`)
  const block = tokensCss.slice(start, tokensCss.indexOf('}', start))
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(
      ([, name, value]) => [name, value],
    ),
  )
}

const light = tokens(':root')
// The dark block only overrides colors; anything it leaves out stays light.
const dark = { ...light, ...tokens(":root[data-theme='dark']") }

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(foreground: string, background: string): number {
  const [high, low] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  )
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

// Every text color on every background it is used on. 4.5:1 is WCAG AA for
// normal-size text.
const PAIRS = [
  ['color-text', 'color-bg'],
  ['color-text', 'color-surface'],
  ['color-text', 'color-surface-muted'],
  ['color-text', 'color-accent-soft'],
  ['color-text', 'color-danger-soft'],
  ['color-text-muted', 'color-bg'],
  ['color-text-muted', 'color-surface'],
  ['color-text-muted', 'color-surface-muted'],
  ['color-accent', 'color-bg'],
  ['color-accent', 'color-surface'],
  ['color-accent', 'color-accent-soft'],
  ['color-danger', 'color-danger-soft'],
] as const

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme', (_, theme) => {
  it.each(PAIRS)('%s on %s meets WCAG AA (4.5:1)', (text, background) => {
    const [foreground, behind] = [theme[text], theme[background]]
    expect(foreground, text).toBeDefined()
    expect(behind, background).toBeDefined()

    expect(contrast(foreground!, behind!)).toBeGreaterThanOrEqual(4.5)
  })
})

it('defines a dark value for every light color', () => {
  const darkOverrides = tokens(":root[data-theme='dark']")
  const uiColors = Object.keys(light).filter((name) =>
    name.startsWith('color-'),
  )

  expect(Object.keys(darkOverrides)).toEqual(expect.arrayContaining(uiColors))
})
