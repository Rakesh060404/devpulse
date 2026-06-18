import React, {
    useState,
    useEffect,
    useContext,
} from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from '../api/axiosInstance';
import { API_URL } from '../config';
import Layout from '../components/Layout';
import RepoCard from '../components/RepoCard';
import StatsCard from '../components/StatsCard';

const Dashboard = () => {
    const { user, setUser } = useContext(AuthContext);
    const [trackedRepos, setTrackedRepos] = useState([]);
    const [stats, setStats] = useState({
        trackedReposCount: 0,
        totalCommitsAllTime: 0,
        totalCommitsThisWeek: 0,
        totalPRsOpen: 0,
        totalPRsMergedAllTime: 0,
        activeDaysThisMonth: 0,
        productivityTrendPercent: 0,
    });
    const [recentActivity, setRecentActivity] = useState({
        commits: [],
        prs: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Initial auth + dashboard load
     */
    useEffect(() => {
        const initialize = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');

                if (token) {
                    localStorage.setItem('token', token);
                    window.history.replaceState({}, document.title, '/dashboard');
                    await verifyToken(token);
                } else {
                    await initializeDashboard();
                }
            } catch (error) {
                console.error('Dashboard initialization failed:', error);
                setError('Failed to initialize dashboard');
            }
        };
        initialize();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Auto polling every 30 seconds
     */
    useEffect(() => {
        if (loading) return;

        const pollInterval = setInterval(async () => {
            await fetchTrackedRepos();
            await fetchStats();
            await fetchRecentActivity();
        }, 30000);

        return () => clearInterval(pollInterval);
    }, [loading]);

    /**
     * Dashboard loader
     */
    const initializeDashboard = async () => {
        try {
            await Promise.all([
                fetchTrackedRepos(),
                fetchStats(),
                fetchRecentActivity(),
            ]);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            setError('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Verify JWT token
     */
    const verifyToken = async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/protected`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                await initializeDashboard();
            } else {
                localStorage.removeItem('token');
                setLoading(false);
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('token');
            setLoading(false);
        }
    };

    /**
     * Fetch tracked repositories
     */
    const fetchTrackedRepos = async () => {
        try {
            const response = await axios.get('/api/repos/tracked');
            setTrackedRepos(response.data || []);
        } catch (error) {
            console.error('Failed to fetch tracked repos:', error);
        }
    };

    /**
     * Fetch dashboard statistics
     */
    const fetchStats = async () => {
        try {
            const response = await axios.get('/api/stats/dashboard');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    /**
     * Fetch recent commits and pull requests
     */
    const fetchRecentActivity = async () => {
        try {
            const response = await axios.get('/api/stats/recent-activity');
            setRecentActivity(response.data || { commits: [], prs: [] });
        } catch (error) {
            console.error('Failed to fetch recent activity:', error);
        }
    };

    /**
     * Sync commits for a repository
     */
    const syncCommits = async (repoId) => {
        try {
            await axios.post(`/api/commits/sync/${repoId}`);
            await fetchStats();
            await fetchTrackedRepos();
            await fetchRecentActivity();
            alert('Commits synced successfully!');
        } catch (error) {
            console.error('Failed to sync commits:', error);
            alert('Failed to sync commits');
        }
    };

    /**
     * Untrack a repository
     */
    const untrackRepo = async (repoId) => {
        try {
            await axios.delete(`/api/repos/${repoId}`);
            await fetchTrackedRepos();
            await fetchStats();
            await fetchRecentActivity();
        } catch (error) {
            console.error('Failed to untrack repository:', error);
            alert('Failed to untrack repository');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl animate-pulse">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <Layout>
            <div className="space-y-8 max-w-7xl mx-auto pb-12">
                {/* Welcome Card Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-56 h-56 rounded-full bg-primary-600/10 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-56 h-56 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent mb-2">
                                Welcome back, {user?.username || 'Developer'}!
                            </h1>
                            <p className="text-gray-400 text-sm md:text-base max-w-xl">
                                Here's a high-level overview of your development activity and tracked repositories.
                            </p>
                        </div>
                        <div className="flex-shrink-0">
                            <Link
                                to="/repositories"
                                className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-primary-900/30 hover:shadow-primary-900/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Track New Repository</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                        <p className="text-red-200">{error}</p>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                    <StatsCard
                        title="Tracked Repos"
                        value={stats?.trackedReposCount?.toString() || '0'}
                        change={0}
                        icon="📁"
                    />
                    <StatsCard
                        title="Total Commits"
                        value={stats?.totalCommitsAllTime?.toLocaleString() || '0'}
                        change={0}
                        icon="💻"
                    />
                    <StatsCard
                        title="Active Days (Mo)"
                        value={stats?.activeDaysThisMonth?.toString() || '0'}
                        change={0}
                        icon="📅"
                    />
                    <StatsCard
                        title="Weekly Commits"
                        value={stats?.totalCommitsThisWeek?.toString() || '0'}
                        change={stats?.productivityTrendPercent}
                        icon="🚀"
                    />
                    <StatsCard
                        title="Open PRs"
                        value={stats?.totalPRsOpen?.toString() || '0'}
                        change={0}
                        icon="🔄"
                    />
                    <StatsCard
                        title="Merged PRs"
                        value={stats?.totalPRsMergedAllTime?.toString() || '0'}
                        change={0}
                        icon="✅"
                    />
                </div>

                {/* Tracked Repositories */}
                <div>
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Tracked Repositories
                    </h2>

                    {trackedRepos.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {trackedRepos.map((repo) => (
                                <RepoCard
                                    key={repo.id}
                                    repo={repo}
                                    onSync={syncCommits}
                                    onUntrack={untrackRepo}
                                    isTracked={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-800/40 border border-gray-750 rounded-xl p-8 text-center">
                            <p className="text-gray-400 mb-4">
                                You are not tracking any repositories yet.
                            </p>
                            <Link
                                to="/repositories"
                                className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                            >
                                Browse & Track Repositories
                            </Link>
                        </div>
                    )}
                </div>

                {/* Recent Activity Split Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Commits Activity */}
                    <div className="bg-gray-800 border border-gray-750 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white">Recent Commits</h2>
                            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                Last 10 commits
                            </span>
                        </div>

                        {recentActivity.commits?.length > 0 ? (
                            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {recentActivity.commits.map((commit, idx) => (
                                    <div
                                        key={commit.sha || idx}
                                        className="flex items-start space-x-3 p-3 bg-gray-900/40 hover:bg-gray-950/40 border border-gray-800 rounded-lg transition-all"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary-900/30 text-primary-400 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                                            {commit.author?.slice(0, 2) || 'DV'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium line-clamp-1">
                                                {commit.message}
                                            </p>
                                            <div className="flex items-center space-x-2 mt-1 text-xs text-gray-400">
                                                <span className="text-gray-300 font-medium truncate max-w-[120px]">
                                                    {commit.author}
                                                </span>
                                                <span>•</span>
                                                <Link
                                                    to={`/repositories/${commit.repo_id}`}
                                                    className="text-primary-400 hover:underline truncate"
                                                >
                                                    {commit.repo_name}
                                                </Link>
                                                <span>•</span>
                                                <span>
                                                    {new Date(commit.committed_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono flex-shrink-0">
                                            {commit.sha?.slice(0, 7) || 'n/a'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500 text-sm">
                                No recent commits found. Sync a repository to fetch commits.
                            </div>
                        )}
                    </div>

                    {/* PRs Activity */}
                    <div className="bg-gray-800 border border-gray-750 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white">Recent Pull Requests</h2>
                            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                Last 10 PRs
                            </span>
                        </div>

                        {recentActivity.prs?.length > 0 ? (
                            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {recentActivity.prs.map((pr, idx) => (
                                    <div
                                        key={pr.id || idx}
                                        className="flex items-start space-x-3 p-3 bg-gray-900/40 hover:bg-gray-950/40 border border-gray-800 rounded-lg transition-all"
                                    >
                                        <div className="flex-shrink-0 mt-0.5">
                                            {pr.state === 'open' ? (
                                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 block" title="Open" />
                                            ) : pr.merged_at ? (
                                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 block" title="Merged" />
                                            ) : (
                                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" title="Closed" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium line-clamp-1">
                                                {pr.title}
                                            </p>
                                            <div className="flex items-center space-x-2 mt-1 text-xs text-gray-400">
                                                <span className="text-gray-300 font-medium truncate max-w-[120px]">
                                                    {pr.user}
                                                </span>
                                                <span>•</span>
                                                <Link
                                                    to={`/repositories/${pr.repo_id}`}
                                                    className="text-primary-400 hover:underline truncate"
                                                >
                                                    {pr.repo_name}
                                                </Link>
                                                <span>•</span>
                                                <span>
                                                    {new Date(pr.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <span
                                                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                                    pr.merged_at
                                                        ? 'bg-purple-900/30 text-purple-400'
                                                        : pr.state === 'open'
                                                        ? 'bg-green-900/30 text-green-400'
                                                        : 'bg-red-900/30 text-red-400'
                                                }`}
                                            >
                                                {pr.merged_at ? 'Merged' : pr.state === 'open' ? 'Open' : 'Closed'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500 text-sm">
                                No recent pull requests found. Sync a repository to fetch PRs.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;