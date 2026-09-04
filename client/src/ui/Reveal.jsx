import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'

/**
 * Fades and lifts children into place as they enter the viewport.
 *
 * Anything on screen at mount is shown immediately and never hidden, so the
 * first painted frame is always complete. Three details exist because content
 * that never appears is far worse than content that never animates:
 *
 * 1. **The root is extended 4000px upwards.** An IntersectionObserver only
 *    reports *threshold crossings*. Flick quickly down a long page and an armed
 *    element can go from below the viewport to above it inside one frame —
 *    ratio 0 before, ratio 0 after, no callback, and the section stays
 *    invisible for the rest of the session.
 * 2. **A timeout reveals it regardless**, so a browser quirk or a detached
 *    subtree cannot leave content hidden. It is below the fold when this fires.
 * 3. **Every bail-out unarms first.** The effect can run more than once — React
 *    deliberately mounts, cleans up and remounts in development — and a second
 *    pass taking an early return used to strand the element armed with nothing
 *    watching it.
 */
export default function Reveal({ children, delay = 0, as: Tag = 'div', className }) {
  const ref = useRef(null)
  const [state, setState] = useState('visible') // 'visible' | 'armed' | 'revealed'

  useLayoutEffect(() => {
    const show = () => setState('revealed')
    const skip = () => {
      setState('visible')
      return undefined
    }

    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return skip()
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return skip()
    try {
      if (JSON.parse(localStorage.getItem('wg-preferences') || '{}').dataSaver) return skip()
    } catch {
      /* unreadable storage means default behaviour, which is to animate */
    }

    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.92) return skip()

    setState('armed')
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show()
          io.disconnect()
        }
      },
      { rootMargin: '4000px 0px -6% 0px', threshold: 0.04 },
    )
    io.observe(el)
    const failsafe = setTimeout(() => {
      show()
      io.disconnect()
    }, 2000)

    return () => {
      clearTimeout(failsafe)
      io.disconnect()
    }
  }, [])

  return (
    <Tag
      ref={ref}
      style={state === 'visible' ? undefined : { transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-[opacity,transform] duration-500 ease-out',
        state === 'armed' && 'translate-y-2.5 opacity-0',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
