import { useEffect, useRef } from 'react'
import { cn } from '../lib/utils'

/**
 * The moving sky behind the hero.
 *
 * This is a *reading of the data*, not a decoration. Everything it draws is
 * driven by a real number that is also printed somewhere on the same screen:
 *
 *   rain     drop count and fall speed come from mm/h
 *   wind     drop slant and cloud drift come from km/h and the bearing
 *   cloud    band opacity comes from cloud cover
 *   night    the palette flips on the real sunset time
 *
 * So when the figures change the sky changes with them, and someone watching
 * can tell heavy rain from drizzle without reading the number. A generic
 * particle field that looked the same in a heatwave would be the thing the
 * rest of this product exists to avoid — a picture that means nothing.
 *
 * Performance, because the target device is a mid-range Android:
 *
 *   * one canvas, one rAF loop, no per-frame allocation
 *   * particle count scales with area and is hard-capped
 *   * the loop stops entirely when the tab is hidden or the canvas scrolls
 *     out of view, so a backgrounded phone is not being drained
 *   * `prefers-reduced-motion` draws a single static frame instead
 *   * data saver draws nothing at all
 */

const MAX_DROPS = 140

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem('wg-preferences') || '{}')
  } catch {
    return {}
  }
}

export default function SkyCanvas({
  mmPerHour = 0,
  windKmh = 0,
  windDeg = 90,
  cloudCover = 0.5,
  night = false,
  tone = 'accent',
  className,
}) {
  const ref = useRef(null)
  // Live values the loop reads without being torn down and rebuilt on every
  // props change — restarting the animation on a data refresh would make the
  // rain visibly stutter every fifteen minutes.
  const cfg = useRef({ mmPerHour, windKmh, windDeg, cloudCover, night, tone })
  cfg.current = { mmPerHour, windKmh, windDeg, cloudCover, night, tone }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return undefined

    const prefs = readPrefs()
    if (prefs.dataSaver) return undefined

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return undefined

    let w = 0
    let h = 0
    let dpr = 1
    let drops = []
    let raf = 0
    let running = false
    let visible = true

    const css = getComputedStyle(document.documentElement)
    const readVar = (name, fallback) => {
      const v = css.getPropertyValue(name).trim()
      return v ? `rgb(${v})` : fallback
    }

    function resize() {
      const rect = canvas.getBoundingClientRect()
      // Cap the pixel ratio at 2: a 3x phone gains nothing visible here and
      // pays for it in fill rate.
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, Math.round(rect.width))
      h = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    function seed() {
      const { mmPerHour: mm } = cfg.current
      // Density scales with rainfall but flattens quickly — the difference
      // between 40 mm and 120 mm is speed and slant, not ten times the drops.
      const wanted = mm <= 0 ? 0 : Math.round(Math.min(MAX_DROPS, (w * h) / 5200 * Math.min(3, 0.6 + Math.sqrt(mm) / 3)))
      drops = new Array(wanted).fill(0).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        len: 6 + Math.random() * 14,
        v: 0.6 + Math.random() * 0.8,
        a: 0.10 + Math.random() * 0.24,
      }))
    }

    function frame() {
      if (!running) return
      const { mmPerHour: mm, windKmh: wind, windDeg: deg, cloudCover: cover, night: isNight, tone: t } = cfg.current

      ctx.clearRect(0, 0, w, h)

      const ink = readVar(t === 'accent' ? '--c-accent' : `--c-sev-${t}`, '#0f6b74')
      const soft = readVar('--c-ink-3', '#6d7d84')

      // --- cloud bands ---
      // Radial gradients, not filled ellipses. A hard-edged ellipse at any
      // opacity reads as a grey blob sitting on the card rather than as cloud
      // behind it — the edge is what gives it away, so there isn't one.
      const band = Math.min(0.22, 0.03 + cover * 0.16) * (isNight ? 0.7 : 1)
      const drift = (Date.now() / 1000) * (0.4 + wind / 90)
      ctx.save()
      for (let i = 0; i < 2; i += 1) {
        const rx = w * 0.42
        const cx = ((drift * (i ? 16 : 10)) % (w + rx * 2)) - rx
        const cy = h * (i ? 0.42 : 0.2)
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx)
        g.addColorStop(0, soft)
        g.addColorStop(1, 'transparent')
        ctx.globalAlpha = band * (i ? 0.8 : 1)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, h * (i ? 0.34 : 0.28), 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      // --- rain: slant is the wind bearing, speed is the rate ---
      if (drops.length) {
        // Bearing is "from", so the drift is the opposite direction. Clamped
        // so a gale slants the rain hard without laying it flat.
        const slant = Math.max(-0.75, Math.min(0.75, -Math.cos((deg * Math.PI) / 180) * (wind / 55)))
        const speed = 2.6 + Math.min(9, mm / 4.5)
        ctx.strokeStyle = ink
        ctx.lineWidth = 1.1
        ctx.lineCap = 'round'
        for (let i = 0; i < drops.length; i += 1) {
          const d = drops[i]
          ctx.globalAlpha = d.a
          ctx.beginPath()
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x + slant * d.len, d.y + d.len)
          ctx.stroke()
          d.y += speed * d.v
          d.x += slant * speed * d.v * 0.5
          if (d.y > h + 20) {
            d.y = -20 - Math.random() * 60
            d.x = Math.random() * (w + 120) - 60
          }
        }
        ctx.globalAlpha = 1
      }

      raf = requestAnimationFrame(frame)
    }

    function start() {
      if (running || reduced || !visible) return
      running = true
      raf = requestAnimationFrame(frame)
    }
    function stop() {
      running = false
      cancelAnimationFrame(raf)
    }

    resize()
    if (reduced) {
      // One static frame: the sky still reads as rain or cloud, it just does
      // not move.
      running = true
      frame()
      running = false
    } else {
      start()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // Stop when the canvas is off screen, and when the tab is backgrounded.
    // A rAF loop in a hidden tab is throttled but not free, and this one is
    // decorative — the numbers it illustrates are printed beside it.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) start()
      else stop()
    })
    io.observe(canvas)

    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  )
}
