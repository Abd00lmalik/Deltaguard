'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] [${this.props.moduleName || 'Generic'}] Unhandled error caught:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-500/20 bg-red-500/[0.02] p-6 text-center w-full h-full min-h-[150px]">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
          <h3 className="font-sora text-sm font-semibold text-white">
            {this.props.moduleName ? `${this.props.moduleName} Load Failed` : 'Component Error'}
          </h3>
          <p className="mt-1 font-manrope text-xs text-text-muted max-w-md">
            {this.state.error?.message || 'An unexpected rendering error occurred within this module.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 rounded border border-red-500/20 bg-red-500/10 px-3 py-1 font-manrope text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
