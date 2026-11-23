import { Component, type ErrorInfo, type ReactNode } from 'react'
import { getT } from '../i18n'
import { Robot } from './Robot'

interface State {
  error: Error | null
}

/** Friendly fallback instead of a white screen. Progress lives in storage, so nothing is lost. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[PencilLoop]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const t = getT()
    return (
      <div className="grid min-h-[70dvh] place-items-center p-6 text-center" role="alert">
        <div className="max-w-sm">
          <div className="mx-auto w-fit">
            <Robot size={96} mood="oops" />
          </div>
          <h1 className="mt-4 text-2xl font-black">{t.errors.crashTitle}</h1>
          <p className="mt-2 text-ink-muted">{t.errors.crashBody}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex h-12 items-center rounded-[14px] bg-primary px-5 font-display font-extrabold text-white shadow-[var(--shadow-press)]"
          >
            {t.errors.reload}
          </button>
        </div>
      </div>
    )
  }
}
