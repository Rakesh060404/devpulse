import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import StatsCard from '../components/StatsCard';
import axios from '../api/axiosInstance';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const RepositoryAnalytics = () => {
    const { repoId } = useParams();
    const [repo, setRepo] = useState(null);
    const [commits, setCommits] = useState([]);
    const [commitDetails, setCommitDetails] = useState([]);
    const [prs, setPrs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [generatingSummary, setGeneratingSummary] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRepoData();
        fetchCommits();
        fetchPRs();
    }, [repoId]);

    const fetchRepoData = async () => {
        try {
            const response = await axios.get(`/api/repos/${repoId}`);
            setRepo(response.data);
        } catch (error) {
            console.error('Failed to fetch repository:', error);
        }
    };

    const fetchCommits = async () => {
        try {
            const response = await axios.get(`/api/commits/${repoId}`);
            setCommitDetails(response.data);

            // Group commits by date for chart
            const commitChartData = response.data.reduce((acc, commit) => {
                const date = commit.date;
                const existing = acc.find(item => item.date === date);
                if (existing) {
                    existing.commits += 1;
                } else {
                    acc.push({ date, commits: 1 });
                }
                return acc;
            }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

            setCommits(commitChartData);
        } catch (error) {
            console.error('Failed to fetch commits:', error);
            setCommits([]);
            setCommitDetails([]);
        }
    };

    const fetchPRs = async () => {
        try {
            const response = await axios.get(`/api/prs/${repoId}`);
            setPrs(response.data);
        } catch (error) {
            console.error('Failed to fetch PRs:', error);
            setPrs([]);
        } finally {
            setLoading(false);
        }
    };

    const generateAISummary = async () => {
        setGeneratingSummary(true);
        try {
            const response = await axios.post(`/api/summaries/generate/${repoId}`);
            setSummary(response.data.summary);
        } catch (error) {
            console.error('Failed to generate AI summary:', error);
            alert('Failed to generate AI summary');
        }
        setGeneratingSummary(false);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-white text-xl">Loading...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-8">
                {/* Repository Header */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{repo?.name || 'Repository'}</h1>
                            <p className="text-gray-400 mb-4">{repo?.description || 'No description'}</p>
                            <div className="flex items-center space-x-6 text-sm text-gray-400">
                                <span>⭐ {repo?.stargazers_count || 0} stars</span>
                                <span>🍴 {repo?.forks_count || 0} forks</span>
                                <span>💻 {repo?.language || 'Unknown'}</span>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
                                Sync Latest
                            </button>
                            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
                                View on GitHub
                            </button>
                        </div>
                    </div>
                </div>

                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Total Commits"
                        value={commits.reduce((sum, day) => sum + day.commits, 0).toLocaleString()}
                        change={12}
                        icon="💻"
                    />
                    <StatsCard
                        title="Contributors"
                        value={new Set(prs.map(pr => pr.user)).size.toString()}
                        change={0}
                        icon="👥"
                    />
                    <StatsCard
                        title="Open PRs"
                        value={prs.filter(pr => pr.state === 'open').length.toString()}
                        change={8}
                        icon="🔄"
                    />
                    <StatsCard
                        title="Merged PRs"
                        value={prs.filter(pr => pr.state === 'closed' && pr.merged_at).length.toString()}
                        change={-2}
                        icon="✅"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Commit Activity Chart */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Commit Activity</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={commits}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#F9FAFB'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="commits"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3B82F6' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Code Changes Chart */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Code Changes</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={commits}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#F9FAFB'
                                    }}
                                />
                                <Bar dataKey="commits" fill="#10B981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Commits */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-6">Recent Commits</h2>
                    <div className="space-y-4">
                        {commitDetails.slice(0, 5).map((commit) => (
                            <div key={commit.id} className="flex items-start space-x-4 p-4 bg-gray-700 rounded-lg">
                                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-medium">
                                        {commit.author ? commit.author.slice(0, 2).toUpperCase() : 'UN'}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{commit.message}</p>
                                    <p className="text-gray-400 text-sm">
                                        {commit.author} committed {new Date(commit.date).toLocaleDateString()}
                                    </p>
                                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                                        <span className="bg-gray-600 px-2 py-1 rounded text-xs">
                                            {commit.sha.slice(0, 7)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {commitDetails.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-gray-400">No commits found. Try syncing repository data.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Engineering Summary */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">AI Engineering Summary</h2>
                        <button
                            onClick={generateAISummary}
                            disabled={generatingSummary}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            {generatingSummary ? 'Generating...' : 'Generate AI Summary'}
                        </button>
                    </div>
                    {summary ? (
                        <div className="bg-gray-700 rounded-lg p-4">
                            <p className="text-gray-300 whitespace-pre-wrap">{summary}</p>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-400">No AI summary generated yet. Click the button above to generate one.</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default RepositoryAnalytics;