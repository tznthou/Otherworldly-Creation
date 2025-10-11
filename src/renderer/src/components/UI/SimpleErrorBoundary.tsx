import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorFallback from './ErrorFallback';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('SimpleErrorBoundary');

interface Props {
  children: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class SimpleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false, error: null })}
          context={this.props.context}
        />
      );
    }

    return this.props.children;
  }
}

export default SimpleErrorBoundary;