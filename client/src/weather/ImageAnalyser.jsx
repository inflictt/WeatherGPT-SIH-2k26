import { useCallback, useEffect, useRef, useState } from 'react'
import { api, LIVE } from '../lib/api'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Meter } from '../ui/Bits'

/**
 * Image analysis — soil type, or crop disease.
 *
 * **This component will not produce a result the app did not receive.**
 *
 * That is the entire design. A crop-disease screen is the most tempting place
 * in the product to fake something: a plausible class name and a confidence
 * bar look convincing, demo well, and would be read by a farmer as a diagnosis.
 * So when no model is reachable it says exactly that, shows what the result
 * *will* look like clearly marked as an example, and offers no verdict. There
 * is no code path here that invents a class or a confidence.
 *
 * With `VITE_API_URL` set it posts the image to the backend, which owns the
 * model call — the HuggingFace token stays server-side, and the image never
 * goes anywhere the user was not told about.
 */

const MAX_BYTES = 6 * 1024 * 1024
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

const MODES = {
  leaf: {
    key: 'leaf',
    title: 'Crop Doctor',
    prompt: 'Add a photo of the affected leaf',
    hint: 'Fill the frame with one leaf, in daylight, against a plain background.',
    cta: 'Check this leaf',
    task: 'disease',
    endpoint: '/api/agriculture/disease/analyze',
    model: 'VisionaryQuant/5_Crop_Disease_Detection',
    resultLabel: 'Most likely class',
    steps: ['Photo stays on your device until you press the button', 'Model returns a class and a confidence', 'Weather and crop stage are added as context', 'You get a risk band and what to check'],
    disclaimer:
      'An image model is not a diagnosis. It suggests what to look at more closely — confirm with your local agricultural extension officer before treating anything.',
  },
  soil: {
    key: 'soil',
    title: 'Soil Check',
    prompt: 'Add a photo of bare soil',
    hint: 'Dig a shallow scrape, photograph the exposed soil in daylight, no vegetation in frame.',
    cta: 'Classify this soil',
    task: 'soil',
    endpoint: '/api/agriculture/soil/analyze',
    model: 'Ben041/soil-type-classifier',
    resultLabel: 'Most likely soil type',
    steps: ['Photo stays on your device until you press the button', 'Model returns a soil type and a confidence', 'The result is saved to your farm profile', 'Future advice uses it as an input'],
    disclaimer:
      'Image classification is not a laboratory soil test. It is a starting point for planning, not a substitute for testing pH, organic carbon or nutrients.',
  },
}

export default function ImageAnalyser({ mode = 'leaf', onResult, crop, location }) {
  const M = MODES[mode] || MODES.leaf
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [state, setState] = useState('idle') // idle | busy | done | error | offline
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  // null while unknown, then true/false. Asked once, so the button is not
  // offered to someone whose server cannot honour it.
  const [available, setAvailable] = useState(null)
  const inputRef = useRef(null)

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

  // Revoke the object URL on replace and on unmount. Without this a few scans
  // in a session leak the whole image each time.
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
      setError(`That photo is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 6 MB — most phone cameras let you send a smaller copy.`)
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
      // No backend, or no token on the one there is. Say so; do not guess.
      setState('offline')
      return
    }
    setState('busy')
    setError(null)
    try {
      const data = await api.analyseImage(M.task, file, {
        crop: crop || undefined,
        // Sent only for the leaf model, and only to fuse the class with the
        // weather — the server needs a place to look up conditions for.
        lat: M.task === 'disease' ? location?.lat : undefined,
        lon: M.task === 'disease' ? location?.lon : undefined,
      })
      // Trust nothing about the shape. A malformed response is a failure, not
      // a result with blanks in it.
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
        <CardHead title={M.title} meta="Photo stays on your device" />
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
                <span className="mt-3 block text-caption font-medium text-ink">{M.prompt}</span>
                <span className="mx-auto mt-1 block max-w-[34ch] text-data leading-relaxed text-ink-3">
                  {M.hint}
                </span>
              </span>
            )}
          </label>

          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={run} disabled={!file || state === 'busy'} className="btn">
              {state === 'busy' ? 'Analysing…' : M.cta}
            </button>
            {file && (
              <button type="button" onClick={reset} className="btn-ghost">
                Reset
              </button>
            )}
          </div>

          <p className="text-data leading-relaxed text-ink-3">
            Runs <code className="code">{M.model}</code> on the server. The photo is sent only when
            you press the button, and is not stored.
          </p>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------- the result */}
      <Card>
        <CardHead title="Result" meta={state === 'done' ? 'From the model' : 'Nothing yet'} />
        <CardBody>
          {state === 'idle' && (
            <div>
              <span className="lbl">No result yet</span>
              <p className="mt-2 text-data leading-relaxed text-ink-2">
                Add a photo and press <strong className="font-medium text-ink">{M.cta}</strong>.
                Here is what happens then:
              </p>
              <ol className="mt-3 space-y-2">
                {M.steps.map((s, i) => (
                  <li key={s} className="flex gap-2.5">
                    <span className="tnum grid h-5 w-5 flex-none place-items-center rounded-md bg-sunk font-mono text-[10px] text-ink-3">
                      {i + 1}
                    </span>
                    <span className="text-data leading-relaxed text-ink-2">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {state === 'busy' && (
            <div className="space-y-3">
              <span className="lbl">Running</span>
              <p className="text-data text-ink-2">Sending the photo and waiting for the model…</p>
              <Meter value={1} max={3} />
            </div>
          )}

          {/* The honest empty state. No class, no confidence, no verdict. */}
          {state === 'offline' && (
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-sev-yellow-w text-sev-yellow">
                <Icon name="alert" size={20} />
              </span>
              <p className="mt-3 text-body-sm font-medium text-ink">No model is connected</p>
              <p className="mt-2 text-data leading-relaxed text-ink-2">
                This build has no backend, so there is nothing to analyse the photo with — and it
                will not guess. A plausible-looking class name and a confidence bar would read as
                a diagnosis, and inventing one is the single worst thing this product could do.
              </p>
              <p className="mt-3 text-data leading-relaxed text-ink-3">
                Set <code className="code">VITE_API_URL</code> and expose{' '}
                <code className="code">{M.endpoint}</code> on the server, with{' '}
                <code className="code">{M.model}</code> behind it. The response needs{' '}
                <code className="code">{'{ prediction, confidence }'}</code> — this screen renders
                whatever it is given and nothing it is not.
              </p>
            </div>
          )}

          {state === 'error' && (
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-sev-red-w text-sev-red">
                <Icon name="alert" size={20} />
              </span>
              <p className="mt-3 text-body-sm font-medium text-ink">That did not work</p>
              <p className="mt-2 text-data leading-relaxed text-ink-2">{error}</p>
              <p className="mt-3 text-data leading-relaxed text-ink-3">
                Nothing is shown in place of a result. Try again, or check the server logs.
              </p>
            </div>
          )}

          {state === 'done' && result && (
            <div className="space-y-4">
              <div>
                <span className="lbl">{M.resultLabel}</span>
                <p className="mt-1 text-heading-sm font-semibold tracking-[-0.02em] text-ink">
                  {result.prediction}
                </p>
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="lbl">Confidence</span>
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
                {result.confidence < 0.6 && (
                  <p className="mt-2 text-data leading-relaxed text-ink-3">
                    Below 60% the model is close to guessing. Treat this as a prompt to look
                    again, not as an answer.
                  </p>
                )}
              </div>

              {Array.isArray(result.alternatives) && result.alternatives.length > 0 && (
                <div>
                  <span className="lbl">Also considered</span>
                  <ul className="mt-2 space-y-1.5">
                    {result.alternatives.slice(0, 3).map((a) => (
                      <li key={a.label} className="flex items-baseline justify-between gap-3 text-data">
                        <span className="text-ink-2">{a.label}</span>
                        <span className="tnum text-ink-3">{Math.round(a.confidence * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* The fused band, when the server had a location to read
                  conditions for. The class alone answers "what does this leaf
                  look like"; this answers "how worried should I be". */}
              {result.risk && (
                <div className="rounded-lg border border-line bg-sunk p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="lbl">Risk, with today's weather</span>
                    <span className="text-caption font-semibold text-ink">{result.risk.band}</span>
                  </div>
                  <p className="mt-2 text-data leading-relaxed text-ink-2">{result.risk.explanation}</p>
                  {result.risk.actions?.length > 0 && (
                    <ul className="mt-2.5 space-y-1.5">
                      {result.risk.actions.map((a) => (
                        <li key={a} className="flex gap-2 text-data leading-relaxed text-ink-2">
                          <span className="mt-[8px] h-px w-2.5 flex-none bg-line" aria-hidden="true" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <p className="border-t border-line-soft pt-3 text-data leading-relaxed text-ink-3">
                {M.disclaimer}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
