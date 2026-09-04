import { useCallback, useEffect, useRef, useState } from 'react'
import { api, LIVE } from '../lib/api'
import { t } from '../lib/i18n'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Meter } from '../ui/Bits'

const MAX_BYTES = 6 * 1024 * 1024
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

const MODES = {
  leaf: {
    key: 'leaf',
    task: 'disease',
    endpoint: '/api/agriculture/disease/analyze',
    model: 'VisionaryQuant/5_Crop_Disease_Detection',
  },
  soil: {
    key: 'soil',
    task: 'soil',
    endpoint: '/api/agriculture/soil/analyze',
    model: 'Ben041/soil-type-classifier',
  },
}

export default function ImageAnalyser({ mode = 'leaf', onResult, crop, location, lang = 'en' }) {
  const M = MODES[mode] || MODES.leaf
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [state, setState] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [available, setAvailable] = useState(null)
  const inputRef = useRef(null)

  const title = mode === 'leaf' ? t('leafTitle', lang) : t('soilTitle', lang)
  const prompt = mode === 'leaf' ? t('leafPrompt', lang) : t('soilPrompt', lang)
  const hint = mode === 'leaf' ? t('leafHint', lang) : t('soilHint', lang)
  const cta = mode === 'leaf' ? t('leafCta', lang) : t('soilCta', lang)
  const resultLabel = mode === 'leaf' ? t('mostLikelyClass', lang) : t('mostLikelySoil', lang)

  useEffect(() => {
    if (!LIVE) {
      setAvailable(false)
      return
    }
    let cancelled = false
    api
      .modelStatus()
      .then((s) => !cancelled && setAvailable(Boolean(s.configured)))
      .catch(() => !cancelled && setAvailable(false))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const reset = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setState('idle')
    if (inputRef.current) inputRef.current.value = ''
  }, [preview])

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!OK_TYPES.includes(f.type)) {
      setError('That file is not an image the models accept. Use a JPEG, PNG or WebP photo.')
      setState('error')
      return
    }
    if (f.size > MAX_BYTES) {
      setError(`That photo is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 6 MB.`)
      setState('error')
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError(null)
    setState('idle')
  }

  const run = async () => {
    if (!file) return
    if (!LIVE || available === false) {
      setState('offline')
      return
    }
    setState('busy')
    setError(null)
    try {
      const data = await api.analyseImage(M.task, file, {
        crop: crop || undefined,
        lat: M.task === 'disease' ? location?.lat : undefined,
        lon: M.task === 'disease' ? location?.lon : undefined,
      })
      if (!data.prediction || typeof data.confidence !== 'number') {
        throw new Error('The model returned no usable prediction.')
      }
      setResult(data)
      setState('done')
      onResult?.({ ...data, mode: M.key })
    } catch (err) {
      setError(String(err?.message || err))
      setState('error')
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* -------------------------------------------------------- the input */}
      <Card>
        <CardHead title={title} meta="Photo stays on your device" />
        <CardBody className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPick}
            className="sr-only"
            id={`img-${M.key}`}
          />
          <label
            htmlFor={`img-${M.key}`}
            className={cn(
              'flex min-h-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-line bg-sunk p-4 text-center transition-colors duration-150 hover:border-accent',
              preview && 'border-solid p-0',
            )}
          >
            {preview ? (
              <img src={preview} alt="The photo you selected" className="h-full max-h-[320px] w-full object-cover" />
            ) : (
              <span className="block">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-accent-soft text-accent">
                  <Icon name="camera" size={22} />
                </span>
                <span className="mt-3 block text-caption font-medium text-ink">{prompt}</span>
                <span className="mx-auto mt-1 block max-w-[34ch] text-data leading-relaxed text-ink-3">
                  {hint}
                </span>
              </span>
            )}
          </label>

          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={run} disabled={!file || state === 'busy'} className="btn">
              {state === 'busy' ? t('analysing', lang) : cta}
            </button>
            {file && (
              <button type="button" onClick={reset} className="btn-ghost">
                {t('resetPhoto', lang)}
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------- the result */}
      <Card>
        <CardHead title="Result" meta={state === 'done' ? 'From AI model' : 'Awaiting input'} />
        <CardBody>
          {state === 'idle' && (
            <div>
              <span className="lbl">No scan yet</span>
              <p className="mt-2 text-data leading-relaxed text-ink-2">
                Add a photo and press <strong className="font-medium text-ink">{cta}</strong> to run local neural analysis.
              </p>
            </div>
          )}

          {state === 'busy' && (
            <div className="space-y-3">
              <span className="lbl">Running</span>
              <p className="text-data text-ink-2">{t('analysing', lang)}</p>
              <Meter value={1} max={3} />
            </div>
          )}

          {state === 'offline' && (
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-sev-yellow-w text-sev-yellow">
                <Icon name="alert" size={20} />
              </span>
              <p className="mt-3 text-body-sm font-medium text-ink">AI Model Service Offline</p>
              <p className="mt-2 text-data leading-relaxed text-ink-2">
                Connect the Python AI engine with HuggingFace models to classify live images.
              </p>
            </div>
          )}

          {state === 'error' && (
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-sev-red-w text-sev-red">
                <Icon name="alert" size={20} />
              </span>
              <p className="mt-3 text-body-sm font-medium text-ink">Scan failed</p>
              <p className="mt-2 text-data leading-relaxed text-ink-2">{error}</p>
            </div>
          )}

          {state === 'done' && result && (
            <div className="space-y-4">
              <div>
                <span className="lbl">{resultLabel}</span>
                <p className="mt-1 text-heading-sm font-semibold tracking-[-0.02em] text-ink">
                  {result.prediction}
                </p>
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="lbl">{t('irrConfidence', lang)}</span>
                  <span className="tnum text-data font-medium text-ink">
                    {Math.round(result.confidence * 100)}%
                  </span>
                </div>
                <Meter
                  value={result.confidence}
                  max={1}
                  tone={result.confidence >= 0.75 ? 'bg-sev-green' : result.confidence >= 0.5 ? 'bg-sev-yellow' : 'bg-sev-orange'}
                  className="mt-2"
                />
              </div>

              {result.risk && (
                <div className="rounded-lg border border-line bg-sunk p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="lbl">{t('tileRisk', lang)}</span>
                    <span className="text-caption font-semibold text-ink">{result.risk.band}</span>
                  </div>
                  <p className="mt-2 text-data leading-relaxed text-ink-2">{result.risk.explanation}</p>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
