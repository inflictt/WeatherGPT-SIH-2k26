import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { SEVERITY } from '../lib/constants'
import { cn, hhmm } from '../lib/utils'

/**
 * The next-twelve-hours curve.
 *
 * Two things this gets right that a naive chart does not:
 *
 *   * **Axis labels are HTML in real CSS gutters, not SVG text.** SVG text
 *     scales with the viewBox, so a label set at 9 units reads 9px on a
 *     desktop chart and about 4px on a phone — the same number, unreadable at
 *     one of them.
 *   * **Every label names a value the chart reaches.** The scale places the
 *     marks, the ticks and the labels; no axis ends at a round number the data
 *     never hits.
 *
 * Colour follows the IMD band of the peak hour, so a heavy-rain curve looks
 * heavy. That is the only thing colour does here.
 */
const W = 720
const H = 168
const PAD = { top: 12, right: 6, bottom: 8, left: 4 }
const GUTTER_L = '2.5rem'
const GUTTER_B = '1.25rem'

/**
 * The hour label. Neither the sample data nor `adaptHourly` carries a `label`
 * field — both give an ISO timestamp in `t` — so the chart derives it rather
 * than reading a key that does not exist, which is what left the whole x-axis
 * blank the first time round.
 */
const hourLabel = (h, i) => h.label ?? (h.t ? hhmm(h.t) : `+${i}h`)

export default function RainChart({ hours = [], fmt, className }) {
  const gid = useId()
  const [hover, setHover] = useState(null)
  const [drawn, setDrawn] = useState(false)
  const raf = useRef(0)

  useEffect(() => {
    // A CSS transition needs a *change* to run, so the class cannot simply be
    // present on the first render — the path would mount already finished.
    raf.current = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(raf.current)
  }, [])

  const scale = useMemo(() => {
    const vals = hours.map((h) => h.mm ?? 0)
    if (!vals.length) return null
    const max = Math.max(...vals, 1) * 1.15
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    return {
      max,
      x: (i) => PAD.left + (hours.length === 1 ? plotW / 2 : (i / (hours.length - 1)) * plotW),
      y: (v) => PAD.top + plotH - (Math.max(0, v) / max) * plotH,
    }
  }, [hours])

  if (!scale) {
    return <p className={cn('py-8 text-center text-data text-ink-3', className)}>No hourly data for this period.</p>
  }

  const peak = Math.max(...hours.map((h) => h.mm ?? 0))
  const tone = peak >= 8.5 ? 'red' : peak >= 4.8 ? 'orange' : peak >= 2.7 ? 'yellow' : 'green'
  const stroke = peak > 0 ? `rgb(var(--c-sev-${tone}))` : 'rgb(var(--c-accent))'

  const line = hours
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${scale.x(i).toFixed(1)} ${scale.y(h.mm ?? 0).toFixed(1)}`)
    .join(' ')
  const area = `${line} L ${scale.x(hours.length - 1).toFixed(1)} ${H - PAD.bottom} L ${scale.x(0).toFixed(1)} ${H - PAD.bottom} Z`

  const ticks = [scale.max, scale.max / 2, 0]
  const step = Math.max(1, Math.round(hours.length / 6))
  const atX = (i) => `calc(${GUTTER_L} + (100% - ${GUTTER_L}) * ${(scale.x(i) / W).toFixed(5)})`
  const atY = (v) => `calc((100% - ${GUTTER_B}) * ${(scale.y(v) / H).toFixed(5)})`

  return (
    <div
      className={cn('relative', className)}
      style={{ paddingLeft: GUTTER_L, paddingBottom: GUTTER_B }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        role="img"
          aria-label={`Precipitation, next ${hours.length} hours, peak ${peak.toFixed(1)} mm per hour`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.26" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <line
            key={i}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={scale.y(t)}
            y2={scale.y(t)}
            stroke="rgb(var(--c-line))"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={area} fill={`url(#${gid})`} className="anim-fade" />
        {/* `pathLength="1"` normalises the dash maths, so two CSS rules draw
            any curve whatever its real geometry. `non-scaling-stroke` keeps the
            line 1.8px thick despite preserveAspectRatio="none" stretching the
            box — without it the curve fattens with the container. */}
        <path
          d={line}
          pathLength="1"
          className={cn('path-draw', drawn && 'is-in')}
          fill="none"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {hover != null && (
          <line
            x1={scale.x(hover)}
            x2={scale.x(hover)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="rgb(var(--c-ink-3))"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}

        {hours.map((h, i) => (
          <rect
            key={`hit-${i}`}
            x={scale.x(i) - (W - PAD.left - PAD.right) / hours.length / 2}
            y={PAD.top}
            width={(W - PAD.left - PAD.right) / hours.length}
            height={H - PAD.top - PAD.bottom}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {/* The dot is HTML so `preserveAspectRatio="none"` cannot squash it into
          an ellipse — the same reason the labels are out here. */}
      {hover != null && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
          style={{ left: atX(hover), top: atY(hours[hover].mm ?? 0), background: stroke }}
        />
      )}

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {ticks.map((t, i) => (
          <span
            key={`y${i}`}
            className="lbl tnum absolute left-0 -translate-y-1/2 text-right"
            style={{ top: atY(t), width: `calc(${GUTTER_L} - 0.5rem)` }}
          >
            {t.toFixed(scale.max < 10 ? 1 : 0)}
          </span>
        ))}
        {hours.map((h, i) =>
          i % step === 0 || i === hours.length - 1 ? (
            <span
              key={`x${i}`}
              className="lbl tnum absolute bottom-0 whitespace-nowrap"
              style={{
                left: atX(i),
                transform: i === 0 ? 'none' : i === hours.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {hourLabel(h, i)}
            </span>
          ) : null,
        )}
      </div>

      {hover != null && (
        <div className="pointer-events-none absolute left-0 top-0 flex items-baseline gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 shadow-card">
          <span className="lbl">{hourLabel(hours[hover], hover)}</span>
          <span className="tnum text-data font-medium text-ink">
            {(hours[hover].mm ?? 0).toFixed(1)} mm/h
          </span>
          {hours[hover].tempC != null && (
            <span className="tnum text-data text-ink-3">{fmt ? fmt.temp(hours[hover].tempC) : hours[hover].tempC}°</span>
          )}
        </div>
      )}
    </div>
  )
}
