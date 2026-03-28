'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('[Aurora ErrorBoundary]', error, errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive text-xl">!</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Algo salió mal
            </h2>
            <p className="text-[10px] text-slate-500 max-w-xs">
              {this.state.error?.message || 'Ha ocurrido un error inesperado.'}
            </p>
          </div>
          <Button
            onClick={this.handleReset}
            size="sm"
            className="text-[9px] font-black uppercase tracking-widest"
          >
            Reintentar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
