import { log } from '../utils/logger.js'

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl })
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || 500
  if (status >= 500) {
    log.error('unhandled error', { path: req.originalUrl, error: err.message, stack: err.stack })
  }
  res.status(status).json({
    error: err.expected || status < 500 ? err.message : 'Something went wrong',
    ...(err.details ? { details: err.details } : {}),
  })
}

/** Wrap an async handler so a rejection reaches the error middleware. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
