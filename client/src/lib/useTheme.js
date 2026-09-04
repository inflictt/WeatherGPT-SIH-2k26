import { useCallback, useEffect, useState } from 'react'

const KEY = 'wg-theme'

function read() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'dark' || v === 'light' ? v : 'system'
  } catch {
    return 'system'
  }
}

/**
 * Theme is one of 'light' | 'dark' | 'system'.
 * 'system' removes the data-theme stamp entirely and lets the
 * prefers-color-scheme block in index.css decide, which is why the toggle
 * has to know about three states even though it only shows two.
 */
export default function useTheme() {
  const [theme, setTheme] = useState(read)

  useEffect(() => {
    const el = document.documentElement
    if (theme === 'system') delete el.dataset.theme
    else el.dataset.theme = theme
    try {
      if (theme === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, theme)
    } catch {
      /* private mode — the choice just will not persist */
    }
  }, [theme])

  const resolved =
    theme === 'system'
      ? typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  const toggle = useCallback(() => {
    setTheme((t) => {
      const now =
        t === 'system'
          ? window.matchMedia?.('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : t
      return now === 'dark' ? 'light' : 'dark'
    })
  }, [])

  return { theme, resolved, setTheme, toggle }
}
