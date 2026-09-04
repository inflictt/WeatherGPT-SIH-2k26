import { Router } from 'express'
import { wrap } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { authLimiter, chatLimiter } from '../middleware/rateLimit.js'

import * as auth from '../controllers/auth.js'
import * as locations from '../controllers/locations.js'
import * as weather from '../controllers/weather.js'
import * as warnings from '../controllers/warnings.js'
import * as risk from '../controllers/risk.js'
import * as chat from '../controllers/chat.js'
import * as alerts from '../controllers/alerts.js'
import { health, telemetry } from '../controllers/health.js'

const r = Router()

/* --- diagnostics ------------------------------------------------------- */
r.get('/health', wrap(health))
r.get('/telemetry', wrap(telemetry))

/* --- auth -------------------------------------------------------------- */
r.post('/auth/register', authLimiter, validate(auth.registerSchema), wrap(auth.register))
r.post('/auth/login', authLimiter, validate(auth.loginSchema), wrap(auth.login))
r.get('/auth/me', requireAuth, wrap(auth.me))
r.patch('/auth/preferences', requireAuth, validate(auth.preferencesSchema), wrap(auth.updatePreferences))

/* --- locations --------------------------------------------------------- */
r.get('/locations/search', validate(locations.searchSchema, 'query'), wrap(locations.search))
r.get('/locations/reverse', validate(locations.coordSchema, 'query'), wrap(locations.reverse))
r.get('/locations/resolve', validate(locations.resolveSchema, 'query'), wrap(locations.resolve))

/* --- weather ----------------------------------------------------------- */
r.get('/weather/current', validate(weather.pointSchema, 'query'), wrap(weather.current))
r.get('/weather/forecast', validate(weather.pointSchema, 'query'), wrap(weather.forecast))
r.get('/weather/ensemble', validate(weather.pointSchema, 'query'), wrap(weather.ensemble))

/* --- official warnings -------------------------------------------------- */
r.get('/warnings/active', validate(warnings.activeSchema, 'query'), wrap(warnings.active))
r.get('/warnings/recent', wrap(warnings.recent))
r.get('/warnings/:identifier', wrap(warnings.byId))
r.post('/warnings/refresh', wrap(warnings.refresh))

/* --- the assembled assessment (Today screen) ----------------------------- */
r.get('/assess', optionalAuth, validate(weather.pointSchema, 'query'), wrap(risk.assess))

/* --- saved locations and push -------------------------------------------- */
// The VAPID key is public by definition and is needed before anyone signs in,
// so it is the one route here without auth.
r.get('/alerts/vapid-key', alerts.vapidKey)
r.get('/alerts/subscriptions', requireAuth, wrap(alerts.list))
r.post('/alerts/subscriptions', requireAuth, validate(alerts.subscribeSchema), wrap(alerts.subscribe))
r.delete('/alerts/subscriptions/:id', requireAuth, wrap(alerts.unsubscribe))
r.post('/alerts/push', requireAuth, validate(alerts.pushSchema), wrap(alerts.registerPush))

/* --- conversation (Ask screen) ------------------------------------------- */
// Rate limited separately: this is the only route that fans out to three
// upstreams and may call a language model, so it must not share a budget with
// cheap reads like /warnings/active.
r.post('/chat/query', chatLimiter, optionalAuth, validate(chat.querySchema), wrap(chat.query))

export default r
