import { Router } from 'express'
import { wrap } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { authLimiter, chatLimiter, imageLimiter } from '../middleware/rateLimit.js'
import { singleImage } from '../middleware/upload.js'

import * as auth from '../controllers/auth.js'
import * as locations from '../controllers/locations.js'
import * as weather from '../controllers/weather.js'
import * as warnings from '../controllers/warnings.js'
import * as risk from '../controllers/risk.js'
import * as chat from '../controllers/chat.js'
import * as alerts from '../controllers/alerts.js'
import { health } from '../controllers/health.js'
import * as agriculture from '../controllers/agriculture.js'
import * as farmManagement from '../controllers/farmManagement.js'
import * as farmerFriend from '../controllers/farmerFriend.js'
import * as voice from '../controllers/voice.js'

const r = Router()

/* --- diagnostics ------------------------------------------------------- */
r.get('/health', wrap(health))

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

/* --- agriculture: farm profile (PRD §12, §42) ----------------------------- */
// Every farm route requires auth. A farm profile is a household's location,
// its crops and its finances; there is no anonymous read of one.
r.get('/agriculture/farm', requireAuth, wrap(agriculture.listFarms))
r.post('/agriculture/farm', requireAuth, validate(agriculture.farmSchema), wrap(agriculture.createFarm))
r.get('/agriculture/farm/:id', requireAuth, wrap(agriculture.getFarm))
r.patch('/agriculture/farm/:id', requireAuth, validate(agriculture.farmSchema.partial()), wrap(agriculture.updateFarm))
r.delete('/agriculture/farm/:id', requireAuth, wrap(agriculture.deleteFarm))

/* --- agriculture: farm management (Fields, Tasks, Activities, Finance, Timeline) --- */
r.get('/agriculture/fields', optionalAuth, wrap(farmManagement.listFields))
r.post('/agriculture/fields', optionalAuth, validate(farmManagement.fieldSchema), wrap(farmManagement.createField))
r.patch('/agriculture/fields/:id', optionalAuth, validate(farmManagement.fieldSchema.partial()), wrap(farmManagement.updateField))
r.delete('/agriculture/fields/:id', optionalAuth, wrap(farmManagement.deleteField))

r.get('/agriculture/tasks', optionalAuth, wrap(farmManagement.listTasks))
r.post('/agriculture/tasks', optionalAuth, validate(farmManagement.taskSchema), wrap(farmManagement.createTask))
r.patch('/agriculture/tasks/:id', optionalAuth, validate(farmManagement.taskSchema.partial()), wrap(farmManagement.updateTask))
r.post('/agriculture/tasks/:id/complete', optionalAuth, wrap(farmManagement.completeTask))
r.delete('/agriculture/tasks/:id', optionalAuth, wrap(farmManagement.deleteTask))

r.get('/agriculture/activities', optionalAuth, wrap(farmManagement.listActivities))
r.post('/agriculture/activities', optionalAuth, validate(farmManagement.activitySchema), wrap(farmManagement.createActivity))
r.delete('/agriculture/activities/:id', optionalAuth, wrap(farmManagement.deleteActivity))

r.get('/agriculture/finance', optionalAuth, wrap(farmManagement.listFinance))
r.post('/agriculture/finance', optionalAuth, validate(farmManagement.financeSchema), wrap(farmManagement.createFinance))
r.delete('/agriculture/finance/:id', optionalAuth, wrap(farmManagement.deleteFinance))

r.get('/agriculture/timeline', optionalAuth, wrap(farmManagement.listTimeline))

r.get('/agriculture/livestock', optionalAuth, wrap(farmManagement.listLivestock))
r.post('/agriculture/livestock', optionalAuth, validate(farmManagement.livestockSchema), wrap(farmManagement.createLivestock))
r.patch('/agriculture/livestock/:id', optionalAuth, validate(farmManagement.livestockSchema.partial()), wrap(farmManagement.updateLivestock))
r.delete('/agriculture/livestock/:id', optionalAuth, wrap(farmManagement.deleteLivestock))

/* --- agriculture: the brief and the engines ------------------------------ */
// `optionalAuth`: the brief works for anyone with a location, and gets better
// when a farm profile exists. Requiring an account to see the weather would
// be the wrong trade for this audience.
r.get('/agriculture/brief', optionalAuth, validate(agriculture.briefSchema, 'query'), wrap(agriculture.brief))
r.post('/agriculture/irrigation', wrap(agriculture.irrigation))
r.post('/agriculture/risk', wrap(agriculture.risk))
r.get('/agriculture/crops', wrap(agriculture.listCrops))
r.get('/agriculture/crop/:crop', wrap(agriculture.cropCalendar))

/* --- agriculture: image models (PRD §7, §8) ------------------------------ */
// `modelStatus` first, so the interface can hide a button rather than offer
// one that 503s.
r.get('/agriculture/models', agriculture.modelStatus)
r.post('/agriculture/soil/analyze', imageLimiter, optionalAuth, singleImage(), wrap(agriculture.analyseSoil))
r.post('/agriculture/disease/analyze', imageLimiter, optionalAuth, singleImage(), wrap(agriculture.analyseDisease))

/* --- Farmer's Friend & Voice (PRD §13, §43) ------------------------------ */
r.post('/ai/farmer-friend/chat', chatLimiter, optionalAuth, validate(farmerFriend.chatSchema), wrap(farmerFriend.chat))
r.post('/ai/voice/transcribe', chatLimiter, optionalAuth, validate(voice.transcribeSchema), wrap(voice.transcribe))

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
