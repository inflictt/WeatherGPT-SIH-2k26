import { Component } from 'react'

/**
 * A crashed screen shows a recovery card, never a stack trace.
 *
 * This wraps each route rather than the whole app, so a bug in the map does not
 * take the warning banner down with it. That ordering is the point: the one
 * thing that must survive every other failure is the screen that tells someone
 * a red alert is active for their district.
 *
 * The technical detail is kept, collapsed. Hiding it entirely helps nobody
 * during a demo; leading with it helps nobody the rest of the time.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // No telemetry endpoint in this project; the console is the whole story.
    console.error('screen crashed', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="shell py-16">
        <div className="mx-auto max-w-measure rounded-lg border border-line bg-surface px-5 py-6">
          <p className="lbl text-[9.5px]">Something broke</p>
          <h2 className="mt-2 font-display text-[20px] font-semibold tracking-[-0.03em] text-ink">
            This screen stopped working
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
            The rest of the app is unaffected — warnings and the forecast are
            still on the Today screen.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-md bg-accent px-4 py-2 text-[13px] text-on-accent transition-opacity duration-200 hover:opacity-90"
            >
              Try again
            </button>
            <a
              href="#/"
              onClick={() => this.setState({ error: null })}
              className="rounded-md border border-line px-4 py-2 text-[13px] text-ink-2 transition-colors duration-200 hover:border-ink-3 hover:text-ink"
            >
              Go to Today
            </a>
          </div>

          <details className="mt-5">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              Technical detail
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-raised p-3 text-[11px] leading-relaxed text-ink-3">
              {String(error?.stack || error?.message || error)}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
