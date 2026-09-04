import { createApp } from './app.js'
import { connectDb, disconnectDb } from './config/db.js'
import { env, assertEnv } from './config/env.js'
import { startJobs } from './jobs/index.js'
import { log } from './utils/logger.js'

async function main() {
  assertEnv()
  await connectDb()

  const app = createApp()
  const server = app.listen(env.port, () => {
    log.info('WeatherGPT API listening', { port: env.port, env: env.nodeEnv })
  })

  const tasks = startJobs()

  const shutdown = async (signal) => {
    log.info('shutting down', { signal })
    tasks.forEach((t) => t.stop?.())
    server.close()
    await disconnectDb()
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
  log.error('failed to start', { error: err.message })
  console.error(err)
  process.exit(1)
})
