import React, { useState, Component, type ReactNode } from 'react';

class ErrorBoundary extends Component<{
  children: ReactNode;
  onError?: (error: Error) => void;
}> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

interface ConsoleLayoutProps {
  header: ReactNode;
  mainContent: ReactNode;
  sidePanel: ReactNode;
  footer?: ReactNode;
  onError?: (error: Error) => void;
  className?: string;
}

export function ConsoleLayout({
  header,
  mainContent,
  sidePanel,
  footer,
  onError,
  className = '',
}: ConsoleLayoutProps) {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <div className="error-container">
        <h2>An error occurred</h2>
        <pre>{error.message}</pre>
        <button onClick={() => setError(null)}>Dismiss</button>
      </div>
    );
  }

  return (
    <div data-component="ConsolePage" className={className}>
      <div className="content-top">{header}</div>
      <div className="content-main">
        <div className="content-logs">
          <ErrorBoundary onError={onError}>{mainContent}</ErrorBoundary>
        </div>
        <div className="content-right">{sidePanel}</div>
      </div>
      {footer && <div className="content-footer">{footer}</div>}
    </div>
  );
}
