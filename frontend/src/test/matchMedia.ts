/**
 * jsdom has no matchMedia. This stand-in reports a system color scheme that
 * tests can change, notifying listeners like a real browser would.
 */
type Listener = (event: { matches: boolean }) => void

const listeners = new Set<Listener>()
let systemDark = false

export function setSystemDark(dark: boolean): void {
  systemDark = dark
  for (const listener of listeners) listener({ matches: dark })
}

export function installMatchMedia(): void {
  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return query.includes('dark') && systemDark
      },
      media: query,
      addEventListener: (_: string, listener: Listener) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) =>
        listeners.delete(listener),
    }) as unknown as MediaQueryList
}

export function resetMatchMedia(): void {
  systemDark = false
  listeners.clear()
}
