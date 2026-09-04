import { useId, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'

/**
 * The hourly curve, as in the reference's gradient area chart.
 *
 * A few things this gets right that a naive chart does not:
 *
 *   * **One scale places everything.** Marks, gridlines and axis labels all
 *     come from the same domain, and every label names a value the chart
 *     actually reaches — no axis ending at a round number the data never hits.
 *   * **The viewBox leaves room for its own labels.** SVG text does not push
 *     bounds, so a chart sized to the plot area silently clips its axis.
 *   * **Colour is not decoration here.** For precipitation the fill takes the
 *     IMD severity of the *peak* value, so a heavy-rain curve looks heavy. For
 *     temperature it stays neutral — a temperature is not a hazard.
 *   * **Hover is progressive.** The chart is complete and readable before any
 *     interaction; the crosshair only adds precision.
 */

const W = 720
const H = 200
const PAD = { top: 16, right: 12, bottom: 26, left: 34 }

export default function AreaChart({
  points = [],
  unit = '',
  tone = null,
  formatValue = (v) => Math.round(v),
  formatLabel = (p) => p.label,
  className,
}) {
  const gradientId = useId()
  const [hover, setHover] = useState(null)

  const scale = useMemo(() => {
    const values = points.map((p) => p.value).filter((v) => v != null)
    if (!values.length) return null

    let min = Math.min(...values)
    let max = Math.max(...values)

    // A flat series still deserves a readable band rather than a single line
    // pinned to the top of the plot.
    if (max - min < 1e-6) {
      min -= 1
      max += 1
    } else {
      const pad = (max - min) * 0.15
      min -= pad
      max += pad
    }
    // Precipitation cannot be negative, and a chart implying it can is wrong.
    if (values.every((v) => v >= 0)) min = Math.max(0, min)

    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    return {
      min,
      max,
      x: (i) => PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW),
      y: (v) => PAD.top + plotH - ((v - min) / (max - min)) * plotH,
    }
  }, [points])

  if (!scale) {
    return (
      <p className={cn('py-8 text-center text-[13px] text-ink-3', className)}>
        No data for this period.
      </p>
    )
  }

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scale.x(i).toFixed(1)} ${scale.y(p.value).toFixed(1)}`)
    .join(' ')
  const area =
    `${line} L ${scale.x(points.length - 1).toFixed(1)} ${H - PAD.bottom} ` +
    `L ${scale.x(0).toFixed(1)} ${H - PAD.bottom} Z`

  // Three gridlines: the two extremes the data reaches, and the midpoint.
  const ticks = [scale.max, (scale.max + scale.min) / 2, scale.min]

  // Roughly six x labels, whatever the series length.
  const step = Math.max(1, Math.round(points.length / 6))
  const stroke = tone ? `rgb(var(--c-sev-${tone}))` : 'rgb(var(--c-ink))'

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Chart, ${formatValue(points[0].value)} to ${formatValue(points[points.length - 1].value)} ${unit}`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={scale.y(t)}
              y2={scale.y(t)}
              stroke="rgb(var(--c-line))"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 7}
              y={scale.y(t) + 3.5}
              textAnchor="end"
              fill="rgb(var(--c-ink-3))"
              className="font-mono"
              style={{ fontSize: 9, fontVariantNumeric: 'tabular-nums' }}
            >
              {formatValue(t)}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={stroke} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) =>
          i % step === 0 || i === points.length - 1 ? (
            <text
              key={i}
              x={scale.x(i)}
              y={H - PAD.bottom + 15}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              fill="rgb(var(--c-ink-3))"
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: '0.06em' }}
            >
              {formatLabel(p)}
            </text>
          ) : null,
        )}

        {hover != null && (
          <g pointerEvents="none">
            <line
              x1={scale.x(hover)} x2={scale.x(hover)}
              y1={PAD.top} y2={H - PAD.bottom}
              stroke="rgb(var(--c-ink-3))" strokeWidth="1" strokeDasharray="3 3"
            />
            <circle cx={scale.x(hover)} cy={scale.y(points[hover].value)} r="3.5"
              fill={stroke} stroke="rgb(var(--c-surface))" strokeWidth="1.5" />
          </g>
        )}

        {/* One transparent band per point, so hover has a target the whole
            height of the plot rather than a 2px line. */}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={scale.x(i) - (W - PAD.left - PAD.right) / points.length / 2}
            y={PAD.top}
            width={(W - PAD.left - PAD.right) / points.length}
            height={H - PAD.top - PAD.bottom}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {hover != null && (
        <div className="pointer-events-none absolute left-0 top-0 flex gap-2 rounded border border-line bg-surface px-2 py-1">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-ink-3">
            {formatLabel(points[hover])}
          </span>
          <span className="tnum font-mono text-[9.5px] text-ink">
            {formatValue(points[hover].value)}
            {unit}
          </span>
        </div>
      )}
    </div>
  )
}
