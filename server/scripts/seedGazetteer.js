#!/usr/bin/env node
/**
 * Seed the gazetteer.
 *
 *   npm run seed
 *       Loads the bundled 99-place seed. Enough for the demo, works offline.
 *
 *   node scripts/seedGazetteer.js --geonames ./IN.txt \
 *        --admin1 ./admin1CodesASCII.txt --admin2 ./admin2Codes.txt
 *       Loads the full GeoNames dump for India — roughly 100k populated
 *       places with district and state. Free, CC BY 4.0:
 *         https://download.geonames.org/export/dump/IN.zip
 *         https://download.geonames.org/export/dump/admin1CodesASCII.txt
 *         https://download.geonames.org/export/dump/admin2Codes.txt
 *
 * Options: --min-population N (default 0), --wipe
 */
import fs from 'node:fs'
import readline from 'node:readline'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { connectDb, disconnectDb } from '../src/config/db.js'
import { Location } from '../src/models/Location.js'
import { slugify } from '../src/services/gazetteer.js'
import { log } from '../src/utils/logger.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? fallback : argv[i + 1] ?? true
}
const has = (name) => argv.includes(`--${name}`)

// GeoNames feature codes worth keeping, mapped to our `kind`.
const FEATURE_KIND = {
  PPLC: 'city', PPLA: 'city', PPLA2: 'district', PPLA3: 'town', PPLA4: 'town',
  PPL: 'village', PPLX: 'village', PPLL: 'village', PPLS: 'village',
}

async function loadBundled() {
  const file = path.resolve(here, '../data/gazetteer.seed.json')
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'))
  return rows.map((r) => ({ ...r, slug: r.slug || slugify(r.name) }))
}

function readCodeMap(file) {
  // "IN.08\tRajasthan\tRajasthan\t1259229"
  const map = new Map()
  if (!file || !fs.existsSync(file)) return map
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const [code, name] = line.split('\t')
    if (code && name) map.set(code.trim(), name.trim())
  }
  return map
}

async function* readGeonames(file, { admin1, admin2, minPopulation }) {
  const rl = readline.createInterface({
    input: fs.createReadStream(file, 'utf8'),
    crlfDelay: Infinity,
  })
  for await (const line of rl) {
    const c = line.split('\t')
    if (c.length < 15) continue
    const [, name, ascii, alt, lat, lon, fclass, fcode, , , a1, a2, , , pop] = c
    if (fclass !== 'P') continue
    const kind = FEATURE_KIND[fcode]
    if (!kind) continue
    const population = Number(pop) || 0
    if (population < minPopulation) continue

    const state = admin1.get(`IN.${a1}`) || undefined
    const district = admin2.get(`IN.${a1}.${a2}`) || undefined

    yield {
      name: name || ascii,
      slug: slugify(ascii || name),
      aliases: (alt || '')
        .split(',')
        .map((s) => slugify(s))
        .filter((s) => s && s.length > 2)
        .slice(0, 6),
      kind,
      district,
      state,
      lat: Number(lat),
      lon: Number(lon),
      zone: 'plains',
      urbanFloodProne: false,
      population,
    }
  }
}

async function upsertAll(iterable, label) {
  let batch = []
  let total = 0
  const flush = async () => {
    if (!batch.length) return
    await Location.bulkWrite(
      batch.map((doc) => ({
        updateOne: {
          filter: { slug: doc.slug, state: doc.state ?? null, kind: doc.kind },
          update: { $set: { ...doc, point: { type: 'Point', coordinates: [doc.lon, doc.lat] } } },
          upsert: true,
        },
      })),
      { ordered: false },
    )
    total += batch.length
    batch = []
    if (total % 20000 === 0) log.info(`${label}: ${total} rows`)
  }

  for await (const doc of iterable) {
    if (!Number.isFinite(doc.lat) || !Number.isFinite(doc.lon) || !doc.slug) continue
    batch.push(doc)
    if (batch.length >= 2000) await flush()
  }
  await flush()
  return total
}

async function main() {
  await connectDb()
  if (has('wipe')) {
    const { deletedCount } = await Location.deleteMany({})
    log.warn('gazetteer wiped', { deletedCount })
  }

  const geonames = flag('geonames')
  let count

  if (geonames) {
    if (!fs.existsSync(geonames)) throw new Error(`GeoNames file not found: ${geonames}`)
    const admin1 = readCodeMap(flag('admin1'))
    const admin2 = readCodeMap(flag('admin2'))
    if (!admin1.size) log.warn('no admin1 file — state names will be missing (--admin1 admin1CodesASCII.txt)')
    if (!admin2.size) log.warn('no admin2 file — district names will be missing (--admin2 admin2Codes.txt)')

    const minPopulation = Number(flag('min-population', 0)) || 0
    log.info('importing GeoNames', { file: geonames, minPopulation })
    count = await upsertAll(
      readGeonames(geonames, { admin1, admin2, minPopulation }),
      'geonames',
    )
    // The curated rows carry zone and flood flags GeoNames does not have.
    count += await upsertAll(await loadBundled(), 'curated overlay')
  } else {
    log.info('importing the bundled seed (pass --geonames for the full dataset)')
    count = await upsertAll(await loadBundled(), 'bundled')
  }

  await Location.syncIndexes()
  const total = await Location.estimatedDocumentCount()
  log.info('gazetteer ready', { upserted: count, total })
  await disconnectDb()
}

main().catch(async (err) => {
  console.error(err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
