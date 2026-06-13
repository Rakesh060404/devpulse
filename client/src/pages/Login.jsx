import React, { useState } from 'react';
import { API_URL } from '../config';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const githubAuthUrl = `${API_URL}/api/auth/github`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Hero Section */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-4">DevPulse</h1>
                    <p className="text-xl text-gray-300 mb-2">Developer Productivity Analytics</p>
                    <p className="text-gray-400">Track your GitHub repositories and boost your development workflow</p>
                </div>

                {/* Login Card */}
                <div className="bg-gray-800 rounded-xl shadow-2xl p-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-white mb-6">Get Started</h2>
                        <a
                            href={githubAuthUrl}
                            target="_top"
                            rel="noopener noreferrer"
                            onClick={() => setLoading(true)}
                            aria-disabled={loading}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3 aria-disabled:opacity-50 aria-disabled:pointer-events-none"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            <span>{loading ? 'Connecting...' : 'Continue with GitHub'}</span>
                        </a>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="text-gray-400">
                        <div className="text-2xl mb-2">📊</div>
                        <p className="text-sm">Analytics</p>
                    </div>
                    <div className="text-gray-400">
                        <div className="text-2xl mb-2">🚀</div>
                        <p className="text-sm">Productivity</p>
                    </div>
                    <div className="text-gray-400">
                        <div className="text-2xl mb-2">🔍</div>
                        <p className="text-sm">Insights</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;