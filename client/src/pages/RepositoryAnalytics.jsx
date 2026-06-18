import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatsCard from '../components/StatsCard';
import axios from '../api/axiosInstance';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
};

const formatFullDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const RepositoryAnalytics = () => {
    const { repoId } = useParams();
    const [repo, setRepo] = useState(null);
    const [commits, setCommits] = useState([]);
    const [commitDetails, setCommitDetails] = useState([]);
    const [prs, setPrs] = useState([]);
    const [prStats, setPRStats] = useState(null);

    const [summaries, setSummaries] = useState([]);
    const [summary, setSummary] = useState(null);
    const [selectedSummaryId, setSelectedSummaryId] = useState('');
    const [generatingSummary, setGeneratingSummary] = useState(false);
    const [syncingPRs, setSyncingPRs] = useState(false);
    const [syncingCommits, setSyncingCommits] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchRepoData(),
            fetchCommits(),
            fetchPRs(),
            fetchPRStats(),
            fetchSummaries()
        ]).finally(() => {
            setLoading(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            setCommitDetails(response.data || []);

            // Group commits by date for chart
            const commitChartData = (response.data || []).reduce((acc, commit) => {
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
            setPrs(response.data || []);
        } catch (error) {
            console.error('Failed to fetch PRs:', error);
            setPrs([]);
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



    const fetchSummaries = async () => {
        try {
            const response = await axios.get(`/api/summaries/${repoId}`);
            setSummaries(response.data || []);
            if (response.data && response.data.length > 0) {
                setSummary(response.data[0].summary_text);
                setSelectedSummaryId(response.data[0].id.toString());
            } else {
                setSummary(null);
                setSelectedSummaryId('');
            }
        } catch (error) {
            console.error('Failed to fetch summaries:', error);
        }
    };

    const handleSummaryChange = (e) => {
        const id = e.target.value;
        setSelectedSummaryId(id);
        const selected = summaries.find(s => s.id.toString() === id);
        if (selected) {
            setSummary(selected.summary_text);
        }
    };

    const syncPRs = async () => {
        setSyncingPRs(true);
        try {
            const response = await axios.post(`/api/prs/sync/${repoId}`);
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

    const syncCommits = async () => {
        setSyncingCommits(true);
        try {
            await axios.post(`/api/commits/sync/${repoId}`);
            await fetchCommits();
            alert('Commits synced successfully!');
        } catch (error) {
            console.error('Failed to sync commits:', error);
            alert('Failed to sync commits: ' + (error.response?.data?.error || error.message));
        } finally {
            setSyncingCommits(false);
        }
    };

    const generateAISummary = async () => {
        setGeneratingSummary(true);
        try {
            await axios.post(`/api/summaries/generate/${repoId}`);
            alert('Summary generated successfully!');
            await fetchSummaries();
        } catch (error) {
            console.error('Failed to generate AI summary:', error);
            alert('Failed to generate AI summary: ' + (error.response?.data?.error || error.message));
        } finally {
            setGeneratingSummary(false);
        }
    };

    const untrackRepo = async () => {
        if (window.confirm(`Are you sure you want to untrack ${repo?.name || 'this repository'}?`)) {
            try {
                await axios.delete(`/api/repos/${repoId}`);
                alert('Repository untracked successfully!');
                window.location.href = '/dashboard';
            } catch (error) {
                console.error('Failed to untrack repository:', error);
                alert('Failed to untrack repository');
            }
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <div className="text-white text-xl animate-pulse">Loading repository details...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-8 max-w-7xl mx-auto pb-12">
                {/* Back Link & Title */}
                <div className="flex items-center space-x-4">
                    <Link
                        to="/dashboard"
                        className="text-gray-400 hover:text-white transition-colors flex items-center space-x-1"
                    >
                        <span>← Back to Dashboard</span>
                    </Link>
                </div>

                {/* Repository Header */}
                <div className="bg-gray-800 border border-gray-750 rounded-xl p-6 shadow-md">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl font-bold text-white mb-2 truncate" title={repo?.name}>
                                {repo?.name || 'Repository'}
                            </h1>
                            <p className="text-gray-400 mb-4 text-sm max-w-2xl">
                                {repo?.description || 'No description provided.'}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400">
                                <span className="flex items-center">⭐ {repo?.stargazers_count || 0} stars</span>
                                <span className="flex items-center">🍴 {repo?.forks_count || 0} forks</span>
                                <span className="flex items-center">💻 {repo?.language || 'Unknown'}</span>
                                {repo?.open_issues_count !== undefined && (
                                    <span className="flex items-center">🐛 {repo.open_issues_count} open issues</span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={syncPRs}
                                disabled={syncingPRs}
                                className="bg-green-650 hover:bg-green-700 disabled:bg-gray-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm flex items-center space-x-1.5"
                            >
                                <span>{syncingPRs ? '📡 Syncing...' : '📡 Sync PRs'}</span>
                            </button>
                            <button
                                onClick={syncCommits}
                                disabled={syncingCommits}
                                className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm flex items-center space-x-1.5"
                            >
                                <span>{syncingCommits ? '💻 Syncing...' : '💻 Sync Commits'}</span>
                            </button>
                            {repo?.html_url && (
                                <a
                                    href={repo.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gray-700 hover:bg-gray-650 text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm text-center flex items-center justify-center"
                                >
                                    View on GitHub
                                </a>
                            )}
                            <button
                                onClick={untrackRepo}
                                className="bg-red-900/40 hover:bg-red-900/80 text-red-200 hover:text-white px-4 py-2.5 rounded-lg transition-all font-medium text-sm flex items-center space-x-1.5"
                                title="Untrack Repository"
                            >
                                <span>🗑️ Untrack</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Total Commits"
                        value={commitDetails.length.toLocaleString()}
                        change={0}
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
                    <div className="bg-gray-800 border border-gray-750 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-white mb-6">Commit Activity</h2>
                        {commits.length === 0 ? (
                            <div className="h-72 flex items-center justify-center text-gray-500">
                                No commit activity data found
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={commits}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={formatDateLabel} />
                                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1F2937',
                                            border: '1px solid #374151',
                                            borderRadius: '8px',
                                            color: '#F9FAFB'
                                        }}
                                        labelFormatter={formatFullDateLabel}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="commits"
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        dot={{ fill: '#3B82F6', r: 3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Code Changes Chart / Commits Per Day */}
                    <div className="bg-gray-800 border border-gray-750 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-white mb-6">Daily Commit Distribution</h2>
                        {commits.length === 0 ? (
                            <div className="h-72 flex items-center justify-center text-gray-500">
                                No commit activity data found
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={commits}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={formatDateLabel} />
                                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1F2937',
                                            border: '1px solid #374151',
                                            borderRadius: '8px',
                                            color: '#F9FAFB'
                                        }}
                                        labelFormatter={formatFullDateLabel}
                                    />
                                    <Bar dataKey="commits" fill="#10B981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>


                </div>

                {/* AI Engineering Summary */}
                <div className="bg-gray-800 border border-gray-750 rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-white">AI Engineering Summary</h2>
                            <p className="text-gray-400 text-xs mt-0.5">Gemini-driven engineering insights and summary.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {summaries.length > 0 && (
                                <select
                                    value={selectedSummaryId}
                                    onChange={handleSummaryChange}
                                    className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500"
                                >
                                    {summaries.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {new Date(s.generated_at).toLocaleDateString()} Summary
                                        </option>
                                    ))}
                                </select>
                            )}
                            <button
                                onClick={generateAISummary}
                                disabled={generatingSummary}
                                className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                                {generatingSummary ? 'Generating...' : 'Generate New Summary'}
                            </button>
                        </div>
                    </div>
                    {summary ? (
                        <div className="bg-gray-900/60 border border-gray-750 rounded-lg p-5">
                            <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{summary}</p>
                        </div>
                    ) : (
                        <div className="bg-gray-900/30 border border-gray-750 border-dashed rounded-lg py-12 text-center">
                            <p className="text-gray-400 text-sm mb-4">No AI summary generated yet.</p>
                            <button
                                onClick={generateAISummary}
                                disabled={generatingSummary}
                                className="bg-primary-650 hover:bg-primary-700 disabled:bg-gray-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                                {generatingSummary ? 'Generating...' : 'Generate AI Summary'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Pull Requests Table */}
                <div className="bg-gray-800 border border-gray-750 rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-white mb-6">Pull Requests ({prs.length})</h2>
                    {prs.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-400 text-sm mb-3">No pull requests found.</p>
                            <button
                                onClick={syncPRs}
                                disabled={syncingPRs}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                                {syncingPRs ? 'Syncing...' : 'Sync PRs from GitHub'}
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-gray-700/60 text-gray-400 font-medium">
                                        <th className="py-3 px-4">Title</th>
                                        <th className="py-3 px-4">State</th>
                                        <th className="py-3 px-4">Author</th>
                                        <th className="py-3 px-4">Created</th>
                                        <th className="py-3 px-4">Merged</th>
                                        <th className="py-3 px-4 text-right">Review Time</th>
                                        <th className="py-3 px-4 text-right">Changes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prs.slice(0, 20).map((pr, idx) => (
                                        <tr key={pr.id || idx} className="border-b border-gray-750/50 hover:bg-gray-750/30 transition-colors">
                                            <td className="py-3.5 px-4 text-gray-200 max-w-xs truncate font-medium" title={pr.title}>{pr.title}</td>
                                            <td className="py-3.5 px-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                                    pr.merged_at
                                                        ? 'bg-purple-900/30 text-purple-400 border border-purple-800/20'
                                                        : pr.state === 'open'
                                                        ? 'bg-green-900/30 text-green-400 border border-green-800/20'
                                                        : 'bg-red-900/30 text-red-400 border border-red-800/20'
                                                }`}>
                                                    {pr.merged_at ? 'Merged' : pr.state === 'open' ? 'Open' : 'Closed'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-gray-300 font-medium">{pr.user || 'N/A'}</td>
                                            <td className="py-3.5 px-4 text-gray-400 text-xs">{new Date(pr.created_at).toLocaleDateString()}</td>
                                            <td className="py-3.5 px-4 text-gray-400 text-xs">{pr.merged_at ? new Date(pr.merged_at).toLocaleDateString() : '-'}</td>
                                            <td className="py-3.5 px-4 text-gray-300 text-right">{pr.review_time_minutes ? `${Math.round(pr.review_time_minutes / 60)}h` : '-'}</td>
                                            <td className="py-3.5 px-4 text-xs text-right font-medium">
                                                <span className="text-green-400">+{pr.additions || 0}</span>
                                                <span className="text-gray-500"> / </span>
                                                <span className="text-red-400">-{pr.deletions || 0}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {prs.length > 20 && (
                                <div className="text-center py-4 text-gray-400 text-sm border-t border-gray-700/30">
                                    Showing 20 of {prs.length} Pull Requests
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Recent Commits */}
                <div className="bg-gray-800 border border-gray-750 rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-white mb-6">Recent Commits</h2>
                    {commitDetails.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-400 text-sm mb-3">No commits found.</p>
                            <button
                                onClick={syncCommits}
                                disabled={syncingCommits}
                                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                                {syncingCommits ? 'Syncing...' : 'Sync Commits'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {commitDetails.slice(0, 10).map((commit, idx) => (
                                <div key={commit.sha || idx} className="flex items-start space-x-4 p-4 bg-gray-900/40 hover:bg-gray-950/40 border border-gray-800 rounded-lg transition-all">
                                    <div className="w-10 h-10 bg-primary-900/20 text-primary-400 rounded-full flex items-center justify-center flex-shrink-0 font-semibold uppercase">
                                        {commit.author ? commit.author.slice(0, 2) : 'DV'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium text-sm sm:text-base line-clamp-2">{commit.message}</p>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
                                            <span className="text-gray-300 font-medium">{commit.author}</span>
                                            <span>•</span>
                                            <span>{new Date(commit.date).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">
                                                {commit.sha.slice(0, 7)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {commitDetails.length > 10 && (
                                <div className="text-center py-2 text-gray-400 text-sm">
                                    Showing latest 10 of {commitDetails.length} commits
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default RepositoryAnalytics;