import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

/**
 * Fades + lifts children into place as they enter the viewport.
 *
 * Anything already on screen at mount is shown immediately and never hidden,
 * so the first painted frame is always complete — important for shared links,
 * previews and anyone who does not scroll. Only content below the fold is
 * armed for the reveal, and reduced-motion or a missing IntersectionObserver
 * skips the effect entirely.
 */
export default function Reveal({ children, delay = 0, as: Tag = 'div', className }) {
  const ref = useRef(null)
  const [state, setState] = useState('visible') // 'visible' | 'armed' | 'revealed'

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    // Data saver turns off reveal animation too. Read from storage rather than
    // a prop so every Reveal in the tree honours it without threading it
    // through five layers of component.
    try {
      if (JSON.parse(localStorage.getItem('wg-preferences') || '{}').dataSaver) return
    } catch {
      /* unreadable storage means default behaviour, which is to animate */
    }

    // Already in view on first paint? Leave it alone.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.92) return

    setState('armed')
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('revealed')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.04 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      style={state === 'visible' ? undefined : { transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-[opacity,transform] duration-[600ms] ease-out',
        state === 'armed' && 'translate-y-3 opacity-0',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
