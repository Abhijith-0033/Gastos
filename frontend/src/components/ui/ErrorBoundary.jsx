import React, { Component } from 'react';
import { AlertCircle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Gastos App Store UI error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center bg-neutral-50">
          <div className="card max-w-md w-full p-8">
            <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-1 text-neutral-900">Something went wrong</h1>
            <p className="text-neutral-400 text-xs mb-6 leading-relaxed">
              An unexpected error occurred while rendering this page.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Reload Page
              </button>
              <a href="/" className="btn-secondary">
                Back to Store
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
