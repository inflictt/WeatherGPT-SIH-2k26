import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { validateRewrite, collectNumbers } from '../src/services/gemini/validation.js'
import { PROSE_FIELDS, buildPrompt } from '../src/services/gemini/prompts.js'
import { classify, isConfigured, MODEL_IDS } from '../src/services/agriculture/imageModels.js'

/**
 * The two things on the Node side that would be dangerous to get wrong:
 * the gate that stops a language model inventing a figure, and the proxy
 * that must never invent a model result.
 */

describe('the Gemini gate', () => {
  const context = { weather: { rain_24h_mm: 118, temp_c: 27, wind_kmh: 34 }, farm_risk: { score: 70 } }
  const original = {
    summary: 'Heavy rain, 118 mm expected in 24 hours.',
    riskBand: 'HIGH',
    recommendedActions: ['Cover harvested produce', 'Delay irrigation'],
  }

  test('a faithful rewrite passes', () => {
    const r = validateRewrite({ summary: 'About 118 mm of rain is coming — that is heavy.' }, original, context)
    assert.equal(r.ok, true, r.reasons.join(','))
  })

  test('an invented figure rejects the whole rewrite', () => {
    const r = validateRewrite({ summary: 'Around 250 mm of rain is coming.' }, original, context)
    assert.equal(r.ok, false)
    assert.ok(r.reasons.some((x) => x.startsWith('ungrounded_number')))
  })

  test('honest rounding is allowed within one percent', () => {
    const r = validateRewrite({ summary: 'Nearly 118 mm.' }, { ...original }, { weather: { rain_24h_mm: 117.6 } })
    assert.equal(r.ok, true, r.reasons.join(','))
  })

  test('a clock time is not read as two numbers', () => {
    const r = validateRewrite({ summary: 'The warning runs until 07:37 tonight.' }, original, context)
    assert.equal(r.ok, true, r.reasons.join(','))
  })

  test('changing a risk band is rejected', () => {
    const r = validateRewrite({ riskBand: 'LOW' }, original, context)
    assert.equal(r.ok, false)
    assert.ok(r.reasons.includes('changed_verdict:riskBand'))
  })

  test('dropping a recommended action is rejected', () => {
    const r = validateRewrite({ recommendedActions: ['Cover harvested produce'] }, original, context)
    assert.equal(r.ok, false)
    assert.ok(r.reasons.includes('actions_length_changed'))
  })

  test('naming a chemical is rejected', () => {
    // §5: a dose or a product name is an extension officer's call, not this
    // system's, and certainly not a language model's.
    for (const text of ['Spray mancozeb at 2 g/l.', 'Apply a fungicide before the rain.']) {
      const r = validateRewrite({ summary: text }, original, context)
      assert.equal(r.ok, false, `should reject: ${text}`)
      assert.ok(r.reasons.some((x) => x.startsWith('chemical_advice')))
    }
  })

  test('an invented figure inside an action is caught too', () => {
    const r = validateRewrite(
      { recommendedActions: ['Cover harvested produce', 'Delay irrigation for 9 days'] },
      original,
      context,
    )
    assert.equal(r.ok, false)
  })

  test('small counting numbers do not trip it', () => {
    const r = validateRewrite({ summary: 'Check the field in the next 24 hours, in 2 places.' }, original, context)
    assert.equal(r.ok, true, r.reasons.join(','))
  })

  test('collectNumbers reads figures out of strings', () => {
    const found = collectNumbers({ a: 'rain 118 mm', b: [{ c: 34 }] })
    assert.ok(found.has(118))
    assert.ok(found.has(34))
  })
})

describe('the prompt', () => {
  test('names only the fields a rewrite may replace', () => {
    const p = buildPrompt({ summary: 'x' }, { weather: {} }, 'en')
    for (const f of PROSE_FIELDS) assert.ok(p.includes(f), `prompt should mention ${f}`)
  })

  test('forbids inventing numbers and naming chemicals', () => {
    const p = buildPrompt({ summary: 'x' }, { weather: {} }, 'en')
    assert.match(p, /Do not introduce any number/i)
    assert.match(p, /pesticide|fungicide/i)
  })

  test('carries the language instruction', () => {
    assert.match(buildPrompt({}, {}, 'hi'), /Devanagari/)
    assert.match(buildPrompt({}, {}, 'hinglish'), /Latin script/)
  })
})

describe('the image-model proxy', () => {
  test('an unconfigured model fails loudly and names the fix', async () => {
    // The whole point: no branch here returns a plausible class.
    if (isConfigured()) return // a real token is set; skip rather than spend it
    await assert.rejects(
      () => classify('soil', Buffer.from('not-really-an-image')),
      (err) => {
        assert.equal(err.status, 503)
        assert.equal(err.details.code, 'MODEL_NOT_CONFIGURED')
        assert.match(err.message, /HF_TOKEN/)
        return true
      },
    )
  })

  test('an unknown task is rejected rather than guessed at', async () => {
    await assert.rejects(() => classify('nonsense', Buffer.from('x')), /Unknown model task/)
  })

  test('both PRD models are wired', () => {
    assert.equal(MODEL_IDS.soil, 'Ben041/soil-type-classifier')
    assert.equal(MODEL_IDS.disease, 'VisionaryQuant/5_Crop_Disease_Detection')
  })
})
