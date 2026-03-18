import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  /** Optional fallback UI — defaults to a simple recovery card */
  fallback?: ReactNode;
  /** Label for logging (e.g. "HomeScreen") */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 32, minHeight: 200, textAlign: 'center', fontFamily: 'var(--font-sans)',
        }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--dw-text-primary)', marginBottom: 8 }}>
            Something went wrong
          </p>
          <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', marginBottom: 16, maxWidth: 300 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '10px 24px', borderRadius: 10,
              background: 'var(--dw-accent)', color: '#fff',
              border: 'none', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
