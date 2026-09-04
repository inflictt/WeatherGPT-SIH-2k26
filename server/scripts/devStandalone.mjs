/**
 * Run the API with no MongoDB installed.
 *
 *     npm run dev:nodb
 *
 * Boots a real mongod in a temp directory via `mongodb-memory-server`, seeds
 * the bundled gazetteer into it, starts the API, and throws the database away
 * on exit. Everything else is identical to `npm run dev` — same routes, same
 * models, same middleware — because it *is* the same app; only the connection
 * string differs.
 *
 * This exists because "install MongoDB first" is where most people trying a
 * project for ten minutes give up, and because a demo machine is not the
 * place to be configuring a database. Data does not survive a restart, which
 * is the correct trade for a demo and the wrong one for anything else — use
 * `npm run dev` with a real MONGO_URI when you want your account to still be
 * there tomorrow.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import 'dotenv/config'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')

/** The first port at or after `start` that nothing is listening on. */
async function firstFreePort(start, tries = 20) {
  const net = await import('node:net')
  for (let p = start; p < start + tries; p += 1) {
    const free = await new Promise((resolve) => {
      const s = net.createServer()
      s.once('error', () => resolve(false))
      s.once('listening', () => s.close(() => resolve(true)))
      s.listen(p, '0.0.0.0')
    })
    if (free) return p
  }
  return start
}

async function main() {
  let MongoMemoryServer
  try {
    ;({ MongoMemoryServer } = await import('mongodb-memory-server'))
  } catch {
    console.error(
      '\n  mongodb-memory-server is not installed.\n' +
        '  Run:  npm install --save-dev mongodb-memory-server\n' +
        '  Or start a real MongoDB and use `npm run dev` instead.\n',
    )
    process.exit(1)
  }

  console.log('  starting a temporary MongoDB (first run downloads it, ~90 s)…')
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'weathergpt' } })

  // Set before importing anything that reads env at module load.
  process.env.MONGO_URI = mongo.getUri('weathergpt')
  process.env.JWT_SECRET ||= 'dev-only-secret-regenerate-before-you-deploy-anything'
  process.env.PYTHON_AI_URL ||= 'http://127.0.0.1:8000'
  process.env.CORS_ORIGINS ||= 'http://localhost:5173'
  process.env.CAP_FALLBACK_TO_SAMPLES ||= 'true'

  await mongoose.connect(process.env.MONGO_URI)

  // Seed the gazetteer, so a search answers with a real place name instead of
  // "Selected location". 99 districts and towns, bundled — the full GeoNames
  // import is `npm run seed -- --geonames`.
  const { Location } = await import('../src/models/Location.js')
  const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/gazetteer.seed.json'), 'utf8'))
  await Location.insertMany(
    rows.map((r) => ({ ...r, location: { type: 'Point', coordinates: [r.lon, r.lat] } })),
    { ordered: false },
  ).catch(() => {})
  await Location.syncIndexes()
  const seeded = await Location.estimatedDocumentCount()

  const { env } = await import('../src/config/env.js')
  const { createApp } = await import('../src/app.js')
  const { startJobs } = await import('../src/jobs/index.js')

  // Find a free port rather than dying on EADDRINUSE. On macOS the AirPlay
  // Receiver holds 5000 and 7000, which is the single most common reason a
  // first run of a Node project fails with an error that explains nothing.
  const port = await firstFreePort(env.port)
  if (port !== env.port) {
    console.log(`  port ${env.port} is taken — using ${port} instead`)
    console.log(`  (set VITE_API_URL=http://localhost:${port} in client/.env)`)
  }

  const server = createApp().listen(port, () => {
    console.log(`\n  API      http://localhost:${port}`)
    console.log(`  health   http://localhost:${port}/api/health`)
    console.log(`  places   ${seeded} seeded`)
    console.log('  database temporary — nothing survives a restart\n')
  })

  const tasks = startJobs()

  const shutdown = async () => {
    tasks.forEach((t) => t.stop?.())
    server.close()
    await mongoose.disconnect().catch(() => {})
    await mongo.stop().catch(() => {})
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
