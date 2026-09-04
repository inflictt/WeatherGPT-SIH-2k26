import { Component } from 'react'
import { Shell } from './Bits'
import Icon from './Icon'

/**
 * Catches a crash in the routed screen and keeps the rest of the app alive.
 *
 * It wraps the screen rather than the whole tree deliberately: a bug in the
 * map must not take the warning banner down with it, and the banner is the one
 * thing that has to survive every other failure.
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
    // eslint-disable-next-line no-console
    console.error('Screen crashed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <Shell className="py-16">
        <div className="mx-auto max-w-measure text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-sev-yellow-w text-sev-yellow">
            <Icon name="alert" size={22} />
          </span>
          <h2 className="headline mt-4 text-heading-sm text-ink">This screen stopped working</h2>
          <p className="mt-3 text-body-sm leading-relaxed text-ink-2">
            The rest of the app is unaffected — warnings and the forecast are still on the other
            tabs. Reloading usually clears it.
          </p>
          <div className="mt-6 flex justify-center gap-2.5">
            <button type="button" onClick={() => window.location.reload()} className="btn">
              Reload
            </button>
            <button type="button" onClick={() => this.setState({ error: null })} className="btn-ghost">
              Try again
            </button>
          </div>
          <pre className="code mt-6 block overflow-x-auto rounded-lg p-3 text-left text-data leading-relaxed">
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      </Shell>
    )
  }
}
