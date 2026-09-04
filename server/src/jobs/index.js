import cron from 'node-cron'
import { env } from '../config/env.js'
import { ingestWarnings, expireWarnings } from '../services/capIngest.js'
import { sendAlerts } from './sendAlerts.js'
import { pushEnabled } from '../services/push.js'
import { log } from '../utils/logger.js'

/**
 * Two jobs, in process. At this volume a queue and a worker fleet would be
 * ceremony — §2 of the PRD cuts them deliberately.
 */
export function startJobs() {
  if (!env.jobsEnabled) {
    log.warn('background jobs disabled (JOBS_ENABLED=false)')
    return []
  }

  const tasks = [
    cron.schedule(env.cronWarnings, () => {
      ingestWarnings().catch((e) => log.error('ingest job failed', { error: String(e.message || e) }))
    }),
    cron.schedule(env.cronExpire, () => {
      expireWarnings().catch((e) => log.error('expire job failed', { error: String(e.message || e) }))
    }),
  ]

  // Only scheduled when it can actually deliver. A job that logs a failure
  // every five minutes trains people to ignore the log.
  if (pushEnabled()) {
    tasks.push(
      cron.schedule(env.cronAlerts, () => {
        sendAlerts().catch((e) => log.error('alert job failed', { error: String(e.message || e) }))
      }),
    )
  } else {
    log.warn('push alerts disabled — set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY')
  }

  log.info('jobs scheduled', { warnings: env.cronWarnings, expire: env.cronExpire })

  // Run once at boot so a fresh deploy is not blind until the first tick.
  ingestWarnings()
    .then(() => expireWarnings())
    .catch((e) => log.warn('startup ingest failed', { error: String(e.message || e) }))

  return tasks
}
