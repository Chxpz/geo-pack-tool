'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for dashboard sections
 * Catches errors per section and displays a fallback UI with retry option
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error(
      '[SectionErrorBoundary] Caught error:',
      {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }
    );
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const fallbackMessage =
        this.props.fallbackMessage ||
        'This section is temporarily unavailable. Please try again.';

      return (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Error icon */}
            <div className="flex-shrink-0 mt-1">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>

            {/* Message and retry button */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-slate-900 mb-1">
                Something went wrong
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {fallbackMessage}
              </p>

              {/* Show error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4">
                  <summary className="text-xs text-slate-500 cursor-pointer font-mono hover:text-slate-700">
                    Error details
                  </summary>
                  <pre className="mt-2 text-xs bg-slate-50 p-2 rounded overflow-auto max-h-32 text-slate-600 whitespace-pre-wrap break-words">
                    {this.state.error.message}
                  </pre>
                </details>
              )}

              {/* Retry button */}
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
