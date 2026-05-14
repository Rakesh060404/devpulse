import React, { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import Layout from '../components/Layout';

const Analytics = () => {
    const [trackedRepos, setTrackedRepos] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [summaries, setSummaries] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(true);
    const [loadingSummaries, setLoadingSummaries] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTrackedRepos();
    }, []);

    useEffect(() => {
        if (selectedRepo) {
            fetchSummaries(selectedRepo.id);
        }
    }, [selectedRepo]);

    const fetchTrackedRepos = async () => {
        try {
            const response = await axios.get('/api/repos/tracked');
            setTrackedRepos(response.data);
            if (response.data.length > 0) {
                setSelectedRepo(response.data[0]);
            }
        } catch (err) {
            console.error('Failed to fetch tracked repos:', err);
            setError('Unable to load tracked repositories.');
        } finally {
            setLoadingRepos(false);
        }
    };

    const fetchSummaries = async (repoId) => {
        setLoadingSummaries(true);
        setError(null);

        try {
            const response = await axios.get(`/api/summaries/${repoId}`);
            setSummaries(response.data);
        } catch (err) {
            console.error('Failed to fetch summaries:', err);
            setError('Unable to load summaries for this repository.');
            setSummaries([]);
        } finally {
            setLoadingSummaries(false);
        }
    };

    const generateSummary = async () => {
        if (!selectedRepo) return;

        setGenerating(true);
        setError(null);

        try {
            const response = await axios.post(`/api/summaries/generate/${selectedRepo.id}`);
            setSummaries(prev => [response.data.summary, ...prev]);
        } catch (err) {
            console.error('Failed to generate summary:', err);
            setError(err.response?.data?.error || 'Failed to generate summary. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
                    <p className="text-gray-400">Generate AI-powered summaries and review repository analytics for tracked repos.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Tracked Repositories</h2>
                        {loadingRepos ? (
                            <p className="text-gray-400">Loading repositories...</p>
                        ) : trackedRepos.length === 0 ? (
                            <p className="text-gray-400">No tracked repositories found. Track a repository from Dashboard to enable summaries.</p>
                        ) : (
                            <div className="space-y-3">
                                {trackedRepos.map(repo => (
                                    <button
                                        key={repo.id}
                                        onClick={() => setSelectedRepo(repo)}
                                        className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${selectedRepo?.id === repo.id ? 'border-primary-600 bg-primary-950' : 'border-gray-700 bg-gray-900 hover:border-gray-500'}`}
                                    >
                                        <div className="text-white font-semibold">{repo.name}</div>
                                        <div className="text-gray-400 text-sm">{repo.full_name}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-800 rounded-lg p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Summary Generator</h2>
                                    <p className="text-gray-400">Generate an AI-driven weekly summary for the selected tracked repository.</p>
                                </div>
                                <button
                                    onClick={generateSummary}
                                    disabled={!selectedRepo || generating}
                                    className="self-start bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {generating ? 'Generating…' : 'Generate Summary'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-700/20 border border-red-600 text-red-100 rounded-lg p-4">
                                {error}
                            </div>
                        )}

                        <div className="bg-gray-800 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Latest Summaries</h2>
                                    <p className="text-gray-400">Review recent AI summaries for the selected repository.</p>
                                </div>
                                <span className="text-sm text-gray-400">{summaries.length} summaries</span>
                            </div>

                            {loadingSummaries ? (
                                <div className="text-gray-400">Loading summaries...</div>
                            ) : !selectedRepo ? (
                                <div className="text-gray-400">Select a tracked repository to view summaries.</div>
                            ) : summaries.length === 0 ? (
                                <div className="text-gray-400">No summaries yet. Generate one to see AI insights.</div>
                            ) : (
                                <div className="space-y-4">
                                    {summaries.map(summary => (
                                        <div key={summary.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white">{summary.summary_text?.slice(0, 60) || 'Weekly summary'}</h3>
                                                    <p className="text-sm text-gray-500">Generated {new Date(summary.generated_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <p className="text-gray-300 whitespace-pre-line">{summary.summary_text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Analytics;
