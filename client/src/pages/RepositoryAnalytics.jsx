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
    const [prStats, setPRStats] = useState(null);
    const [weeklyPRStats, setWeeklyPRStats] = useState([]);
    const [summary, setSummary] = useState(null);
    const [generatingSummary, setGeneratingSummary] = useState(false);
    const [syncingPRs, setSyncingPRs] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRepoData();
        fetchCommits();
        fetchPRs();
        fetchPRStats();
        fetchWeeklyPRStats();
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

    const fetchPRStats = async () => {
        try {
            const response = await axios.get(`/api/prs/stats/${repoId}`);
            setPRStats(response.data);
        } catch (error) {
            console.error('Failed to fetch PR stats:', error);
        }
    };

    const fetchWeeklyPRStats = async () => {
        try {
            const response = await axios.get(`/api/prs/${repoId}/weekly-stats?weeks=12`);
            // Sort by week_start descending (most recent first) then reverse for chart
            const sorted = (response.data || [])
                .sort((a, b) => new Date(b.week_start) - new Date(a.week_start))
                .reverse();
            setWeeklyPRStats(sorted);
        } catch (error) {
            console.error('Failed to fetch weekly PR stats:', error);
            setWeeklyPRStats([]);
        }
    };

    const syncPRs = async () => {
        setSyncingPRs(true);
        try {
            const response = await axios.post(`/api/prs/sync/${repoId}`);
            console.log('PR sync result:', response.data);
            // Refresh PR data after sync
            await fetchPRs();
            await fetchPRStats();
            alert(`Successfully synced ${response.data.syncedCount} PRs!`);
        } catch (error) {
            console.error('Failed to sync PRs:', error);
            alert('Failed to sync PRs: ' + (error.response?.data?.error || error.message));
        } finally {
            setSyncingPRs(false);
        }
    };

    const generateAISummary = async () => {
        console.log('[FRONTEND] Generate AI Summary button clicked');
        console.log('[FRONTEND] Repo ID:', repoId);
        setGeneratingSummary(true);
        try {
            console.log('[FRONTEND] Sending POST request to /api/summaries/generate/' + repoId);
            const response = await axios.post(`/api/summaries/generate/${repoId}`);
            console.log('[FRONTEND] Response received:', response.data);
            console.log('[FRONTEND] Summary text:', response.data.summary?.summary_text);
            setSummary(response.data.summary?.summary_text || response.data.summary);
        } catch (error) {
            console.error('[FRONTEND] Failed to generate AI summary:', error);
            console.error('[FRONTEND] Error response:', error.response?.data);
            alert('Failed to generate AI summary: ' + (error.response?.data?.error || error.message));
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
                            <button
                                onClick={syncPRs}
                                disabled={syncingPRs}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium">
                                {syncingPRs ? '📡 Syncing PRs...' : '📡 Sync PRs'}
                            </button>
                            <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
                                Sync Commits
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
                        title="Open PRs"
                        value={prStats?.openPRs?.toString() || '0'}
                        change={0}
                        icon="🔄"
                    />
                    <StatsCard
                        title="Merged PRs"
                        value={prStats?.mergedPRs?.toString() || '0'}
                        change={0}
                        icon="✅"
                    />
                    <StatsCard
                        title="Avg Review Time"
                        value={prStats?.avgReviewTimeMinutes ? `${Math.round(prStats.avgReviewTimeMinutes / 60)}h` : 'N/A'}
                        change={0}
                        icon="⏱️"
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

                    {/* Weekly PR Creation Chart */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Weekly PR Creation</h2>
                        {weeklyPRStats.length === 0 ? (
                            <div className="h-300 flex items-center justify-center text-gray-400">
                                No PR data available
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={weeklyPRStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis
                                        dataKey="week_start"
                                        stroke="#9CA3AF"
                                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1F2937',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#F9FAFB'
                                        }}
                                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                    />
                                    <Bar dataKey="prs_created" fill="#8B5CF6" name="Created" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Weekly PR Merge Chart */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Weekly PR Merges</h2>
                        {weeklyPRStats.length === 0 ? (
                            <div className="h-300 flex items-center justify-center text-gray-400">
                                No PR data available
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={weeklyPRStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis
                                        dataKey="week_start"
                                        stroke="#9CA3AF"
                                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1F2937',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#F9FAFB'
                                        }}
                                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                    />
                                    <Bar dataKey="prs_merged" fill="#10B981" name="Merged" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Pull Requests Table */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-6">Pull Requests ({prs.length})</h2>
                    {prs.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-400">No pull requests found. Click "Sync PRs" to fetch from GitHub.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Title</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-300">State</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Author</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Created</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Merged</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Review Time</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Changes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prs.slice(0, 20).map((pr, idx) => (
                                        <tr key={pr.id || idx} className="border-b border-gray-700 hover:bg-gray-700 transition-colors">
                                            <td className="py-3 px-4 text-gray-100 max-w-xs truncate" title={pr.title}>{pr.title}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${pr.merged_at ? 'bg-purple-900 text-purple-200' :
                                                    pr.state === 'open' ? 'bg-green-900 text-green-200' :
                                                        'bg-red-900 text-red-200'
                                                    }`}>
                                                    {pr.merged_at ? 'Merged' : pr.state === 'open' ? 'Open' : 'Closed'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-300">{pr.user || 'N/A'}</td>
                                            <td className="py-3 px-4 text-gray-400 text-xs">{new Date(pr.created_at).toLocaleDateString()}</td>
                                            <td className="py-3 px-4 text-gray-400 text-xs">{pr.merged_at ? new Date(pr.merged_at).toLocaleDateString() : '-'}</td>
                                            <td className="py-3 px-4 text-gray-300">{pr.review_time_minutes ? `${Math.round(pr.review_time_minutes / 60)}h` : '-'}</td>
                                            <td className="py-3 px-4 text-xs">
                                                <span className="text-green-400">+{pr.additions || 0}</span>
                                                <span className="text-gray-400"> / </span>
                                                <span className="text-red-400">-{pr.deletions || 0}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {prs.length > 20 && (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                    Showing 20 of {prs.length} PRs
                                </div>
                            )}
                        </div>
                    )}
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