import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                    <div className="bg-red-900 border border-red-700 rounded-lg p-8 max-w-md">
                        <h1 className="text-2xl font-bold text-red-100 mb-4">Something went wrong</h1>
                        <p className="text-red-100 mb-6">An unexpected error occurred. Please try refreshing the page.</p>
                        <details className="mb-6">
                            <summary className="text-red-200 cursor-pointer font-semibold mb-2">Error details</summary>
                            <pre className="bg-red-950 p-3 rounded text-red-100 text-sm overflow-auto max-h-48">
                                {this.state.error?.toString()}
                            </pre>
                        </details>
                        <button
                            onClick={() => window.location.href = '/dashboard'}
                            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
