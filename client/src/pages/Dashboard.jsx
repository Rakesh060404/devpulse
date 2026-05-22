import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from '../api/axiosInstance';
import Layout from '../components/Layout';
import RepoCard from '../components/RepoCard';
import StatsCard from '../components/StatsCard';

const Dashboard = () => {
    const { user, setUser, logout } = useContext(AuthContext);
    const [repos, setRepos] = useState([]);
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check for token in URL params (from OAuth redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            localStorage.setItem('token', token);
            // Clean up URL
            window.history.replaceState({}, document.title, '/dashboard');
            // Verify and set user
            verifyToken(token);
        } else {
            // Token already in localStorage or missing, proceed with fetching
            initializeDashboard();
        }
    }, []);

    // Set up polling for real-time updates every 30 seconds
    useEffect(() => {
        if (loading) return; // Don't poll while initial load is in progress

        const pollInterval = setInterval(() => {
            fetchStats();
            fetchTrackedRepos();
        }, 30000); // 30 seconds

        return () => clearInterval(pollInterval); // Cleanup on unmount
    }, [loading]);

    const initializeDashboard = async () => {
        try {
            await fetchRepos();
            await fetchTrackedRepos();
            await fetchStats();
        } catch (err) {
            console.error('Failed to initialize dashboard:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const verifyToken = async (token) => {
        try {
            const response = await fetch('http://localhost:5000/api/protected', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                // After user is set, initialize dashboard
                setTimeout(() => initializeDashboard(), 100);
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
    const fetchRepos = async () => {
        try {
            const response = await axios.get('/api/repos');
            setRepos(response.data);
        } catch (error) {
            console.error('Failed to fetch repos:', error);
            setError('Failed to load repositories');
        }
    };

    const fetchTrackedRepos = async () => {
        try {
            const response = await axios.get('/api/repos/tracked');
            setTrackedRepos(response.data);
        } catch (error) {
            console.error('Failed to fetch tracked repos:', error);
            setError('Failed to load tracked repositories');
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get('/api/stats/dashboard');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            setError('Failed to load statistics');
            // Keep stats as-is (zeros) on error
        }
    };

    const trackRepo = async (repo) => {
        try {
            await axios.post('/api/repos', {
                github_repo_id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                html_url: repo.html_url,
                description: repo.description,
            });
            fetchTrackedRepos();
        } catch (error) {
            console.error('Failed to track repo:', error);
        }
    };

    const syncCommits = async (repoId) => {
        try {
            await axios.post(`/api/commits/sync/${repoId}`);
            alert('Commits synced successfully!');
        } catch (error) {
            console.error('Failed to sync commits:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <Layout>
            <div className="space-y-8">
                {/* Welcome Section */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.username || 'Developer'}!</h1>
                    <p className="text-gray-400">Here's an overview of your development activity</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                        <p className="text-red-100">{error}</p>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Tracked Repos"
                        value={stats.trackedReposCount.toLocaleString()}
                        change={0}
                        icon="📁"
                    />
                    <StatsCard
                        title="Total Commits"
                        value={stats.totalCommitsAllTime.toLocaleString()}
                        change={Math.round((stats.totalCommitsThisWeek / (stats.totalCommitsAllTime || 1)) * 100)}
                        icon="💻"
                    />
                    <StatsCard
                        title="Active Days"
                        value={stats.activeDaysThisMonth.toString()}
                        change={15}
                        icon="📅"
                    />
                    <StatsCard
                        title="Productivity Trend"
                        value={`${stats.productivityTrendPercent >= 0 ? '+' : ''}${stats.productivityTrendPercent}%`}
                        change={stats.productivityTrendPercent}
                        icon="🚀"
                    />
                </div>

                {/* GitHub Repositories Section */}
                <div>
                    <h2 className="text-2xl font-semibold text-white mb-6">Your GitHub Repositories</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {repos.slice(0, 6).map(repo => (
                            <RepoCard
                                key={repo.id}
                                repo={repo}
                                onTrack={trackRepo}
                                isTracked={false} // TODO: check if tracked
                            />
                        ))}
                    </div>
                </div>

                {/* Tracked Repositories Section */}
                {trackedRepos.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-6">Tracked Repositories</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {trackedRepos.map(repo => (
                                <RepoCard
                                    key={repo.id}
                                    repo={repo}
                                    onSync={syncCommits}
                                    isTracked={true}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-2xl font-semibold text-white mb-6">Recent Activity</h2>
                    <div className="space-y-4">
                        {/* Placeholder for recent commits */}
                        <div className="text-gray-400 text-center py-8">
                            Recent commits will appear here once repositories are tracked and synced.
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;