import React, { Component, ErrorInfo, ReactNode } from 'react';
import { environmentSafety, reportError } from '../../utils/environmentSafety';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  safeMode: boolean;
}

export class SafetyErrorBoundary extends Component<Props, State> {
  private errorCount = 0;
  private maxErrors = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      safeMode: false
    };

    // 監聽安全模式啟用事件
    if (typeof window !== 'undefined') {
      window.addEventListener('safemode-enabled', this.handleSafeModeEnabled);
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('safemode-enabled', this.handleSafeModeEnabled);
    }
  }

  private handleSafeModeEnabled = () => {
    this.setState({ safeMode: true });
  };

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能夠顯示降級後的 UI
    return {
      hasError: true,
      error,
      errorInfo: null,
      safeMode: environmentSafety.isSafeMode()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.errorCount++;
    
    // 記錄錯誤到環境安全系統
    const errorMessage = `${error.name}: ${error.message}`;
    const context = this.props.context || 'ErrorBoundary';
    
    reportError(errorMessage, context);
    
    this.setState({
      error,
      errorInfo,
      safeMode: environmentSafety.isSafeMode()
    });

    // 如果錯誤過多，強制啟用安全模式
    if (this.errorCount >= this.maxErrors) {
      environmentSafety.forceSafeMode();
    }

    console.error('SafetyErrorBoundary 捕獲錯誤:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleEnableSafeMode = () => {
    environmentSafety.forceSafeMode();
    this.setState({ safeMode: true });
    // 重新渲染以使用安全模式
    this.handleRetry();
  };

  render() {
    if (this.state.hasError) {
      // 自定義錯誤 UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-container bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                發生了錯誤
                {this.state.safeMode && <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">安全模式</span>}
              </h3>
            </div>
          </div>

          <div className="text-sm text-red-700 mb-4">
            {this.state.error && (
              <div className="mb-2">
                <strong>錯誤:</strong> {this.state.error.message}
              </div>
            )}
            {this.props.context && (
              <div className="mb-2">
                <strong>上下文:</strong> {this.props.context}
              </div>
            )}
            <div className="text-xs text-red-600">
              {this.state.safeMode 
                ? '安全模式已啟用，某些功能可能不可用。' 
                : '您可以嘗試重新載入或啟用安全模式。'
              }
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={this.handleRetry}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              重試
            </button>
            {!this.state.safeMode && (
              <button
                onClick={this.handleEnableSafeMode}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                啟用安全模式
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              重新載入頁面
            </button>
          </div>

          {/* 開發模式下顯示錯誤詳情 */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                顯示錯誤詳情
              </summary>
              <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-800 overflow-auto">
                <div className="mb-2">
                  <strong>錯誤堆疊:</strong>
                </div>
                <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                {this.state.errorInfo && (
                  <div className="mt-2">
                    <strong>組件堆疊:</strong>
                    <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default SafetyErrorBoundary;