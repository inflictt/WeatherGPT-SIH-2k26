/** Structured-enough logging with zero dependencies. */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const threshold = LEVELS[process.env.LOG_LEVEL || 'info'] ?? 20

function emit(level, msg, extra) {
  if (LEVELS[level] < threshold) return
  const line = { t: new Date().toISOString(), level, msg, ...(extra || {}) }
  const out = level === 'error' || level === 'warn' ? console.error : console.log
  out(process.env.NODE_ENV === 'production' ? JSON.stringify(line) : format(line))
}

function format({ t, level, msg, ...rest }) {
  const tag = { debug: 'DBG', info: 'INF', warn: 'WRN', error: 'ERR' }[level]
  const detail = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : ''
  return `${t.slice(11, 19)} ${tag} ${msg}${detail}`
}

export const log = {
  debug: (m, e) => emit('debug', m, e),
  info: (m, e) => emit('info', m, e),
  warn: (m, e) => emit('warn', m, e),
  error: (m, e) => emit('error', m, e),
}
