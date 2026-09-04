import { useCallback, useEffect, useState } from 'react'

const KEY = 'wg-theme'

function read() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'dark' || v === 'light' ? v : 'dark'
  } catch {
    return 'dark'
  }
}

/**
 * Theme is one of 'light' | 'dark'.
 * Default is nocturnal 'dark' mode.
 */
export default function useTheme() {
  const [theme, setTheme] = useState(read)

  const resolved = theme

  useEffect(() => {
    const el = document.documentElement
    el.dataset.theme = theme
    if (theme === 'dark') {
      el.classList.add('dark')
      el.classList.remove('light')
    } else {
      el.classList.add('light')
      el.classList.remove('dark')
    }
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* private mode */
    }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, resolved, setTheme, toggle }
}
