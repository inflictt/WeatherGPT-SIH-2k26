#!/usr/bin/env node
/**
 * Fetch, parse and store official warnings once, then print what happened.
 * This is the Phase 2 acceptance check: it must print real active warnings
 * for a named district without any UI involved.
 *
 *   npm run warnings:once -- --district Udaipur
 */
import { connectDb, disconnectDb } from '../src/config/db.js'
import { ingestWarnings, expireWarnings, warningsForPoint } from '../src/services/capIngest.js'
import { Warning } from '../src/models/Warning.js'

const argv = process.argv.slice(2)
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`)
  return i === -1 ? d : argv[i + 1] ?? d
}

const line = (s = '') => process.stdout.write(s + '\n')

async function main() {
  await connectDb()

  line('\n─── ingest ───────────────────────────────────────────')
  const result = await ingestWarnings()
  line(JSON.stringify(result, null, 2))

  const expired = await expireWarnings()
  line(`expired: ${expired.expired}`)

  const district = flag('district', 'Udaipur')
  line(`\n─── active warnings for ${district} ──────────────────`)
  const rows = await warningsForPoint({ district })
  if (!rows.length) line('(none)')
  for (const w of rows) {
    line('')
    line(`  ${w.colour.toUpperCase().padEnd(7)} ${w.severity.padEnd(9)} ${w.event}`)
    line(`  area    : ${w.area?.description || w.area?.districts?.join(', ') || '—'}`)
    line(`  valid   : ${w.effective?.toISOString?.() ?? w.effective} → ${w.expires?.toISOString?.() ?? w.expires}`)
    line(`  sender  : ${w.senderName || w.sender}`)
    line(`  polygon : ${w.area?.geometry ? 'yes' : 'no (district match)'}`)
    line(`  headline: ${w.headline}`)
  }

  const total = await Warning.countDocuments()
  const active = await Warning.countDocuments({ status: 'active' })
  line(`\nstored: ${total} total, ${active} active\n`)
  await disconnectDb()
}

main().catch(async (e) => { console.error(e); process.exit(1) })
