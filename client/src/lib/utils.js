/** Tiny classname joiner. No dependency needed for what it does. */
export function cn(...parts) {
  return parts.flat().filter(Boolean).join(' ')
}

/** 24h "16:00" from an ISO string, in the user's locale time. */
export function hhmm(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** "Fri 4 Sep, 16:00" */
export function stamp(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** "3 min ago" — good enough for a freshness badge. */
export function ago(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`
}

/** Clamp a 0–100 score to a percentage width string. */
export function pct(n) {
  return `${Math.min(100, Math.max(0, n))}%`
}
