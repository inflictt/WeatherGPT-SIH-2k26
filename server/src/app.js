import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import routes from './routes/index.js'
import { env } from './config/env.js'
import { apiLimiter } from './middleware/rateLimit.js'
import { notFoundHandler, errorHandler } from './middleware/error.js'
import { log } from './utils/logger.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1) // free hosts (Render, Fly) sit behind a proxy
  app.disable('x-powered-by')

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(
    cors({
      origin(origin, cb) {
        // no Origin header = curl, server-to-server, health checks
        if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) return cb(null, true)
        cb(new Error(`Origin not allowed: ${origin}`))
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '256kb' }))

  app.use((req, _res, next) => {
    const started = Date.now()
    req.on('end', () => log.debug('request', { m: req.method, p: req.originalUrl, ms: Date.now() - started }))
    next()
  })

  app.get('/', (_req, res) =>
    res.json({ name: 'WeatherGPT API', version: '0.2.0', docs: '/api/health' }),
  )

  app.use('/api', apiLimiter, routes)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
