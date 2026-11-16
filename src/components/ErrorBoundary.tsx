import { Component, type ReactNode } from 'react'
import { ErrorScreen } from './Screens'

/** Catches render and code-loading failures so the visitor never sees a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidMount() {
    // A failed hash navigation to another screen deserves a fresh attempt.
    addEventListener('hashchange', this.reset)
  }

  componentWillUnmount() {
    removeEventListener('hashchange', this.reset)
  }

  reset = () => {
    if (this.state.error) this.setState({ error: null })
  }

  render() {
    return this.state.error ? (
      <ErrorScreen error={this.state.error} offline={!navigator.onLine} />
    ) : (
      this.props.children
    )
  }
}
