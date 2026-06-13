import React, {
    useState,
    useEffect,
    useContext,
} from 'react';

import { AuthContext } from '../context/AuthContext';

import axios from '../api/axiosInstance';

import Layout from '../components/Layout';
import RepoCard from '../components/RepoCard';
import StatsCard from '../components/StatsCard';

const Dashboard = () => {

    const {
        user,
        setUser,
        logout,
    } = useContext(AuthContext);

    const [repos, setRepos] = useState([]);

    const [trackedRepos, setTrackedRepos] =
        useState([]);

    const [stats, setStats] = useState({
        trackedReposCount: 0,
        totalCommitsAllTime: 0,
        totalCommitsThisWeek: 0,
        totalPRsOpen: 0,
        totalPRsMergedAllTime: 0,
        activeDaysThisMonth: 0,
        productivityTrendPercent: 0,
    });

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState(null);

    /**
     * Initial auth + dashboard load
     */
    useEffect(() => {

        const initialize = async () => {

            try {

                const urlParams =
                    new URLSearchParams(
                        window.location.search
                    );

                const token =
                    urlParams.get('token');

                if (token) {

                    localStorage.setItem(
                        'token',
                        token
                    );

                    window.history.replaceState(
                        {},
                        document.title,
                        '/dashboard'
                    );

                    await verifyToken(token);

                } else {

                    await initializeDashboard();

                }

            } catch (error) {

                console.error(
                    'Dashboard initialization failed:',
                    error
                );

                setError(
                    'Failed to initialize dashboard'
                );

            }

        };

        initialize();

    }, []);

    /**
     * Auto polling every 30 seconds
     */
    useEffect(() => {

        if (loading) return;

        const pollInterval =
            setInterval(async () => {

                await fetchRepos();
                await fetchTrackedRepos();
                await fetchStats();

            }, 30000);

        return () =>
            clearInterval(pollInterval);

    }, [loading]);

    /**
     * Dashboard loader
     */
    const initializeDashboard =
        async () => {

            try {

                await Promise.all([
                    fetchRepos(),
                    fetchTrackedRepos(),
                    fetchStats(),
                ]);

            } catch (error) {

                console.error(
                    'Failed to load dashboard:',
                    error
                );

                setError(
                    'Failed to load dashboard'
                );

            } finally {

                setLoading(false);

            }

        };

    /**
     * Verify JWT token
     */
    const verifyToken = async (token) => {

        try {

            const response = await fetch(
                'http://localhost:5000/api/protected',
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {

                const data =
                    await response.json();

                setUser(data.user);

                await initializeDashboard();

            } else {

                localStorage.removeItem(
                    'token'
                );

                setLoading(false);

            }

        } catch (error) {

            console.error(
                'Token verification failed:',
                error
            );

            localStorage.removeItem(
                'token'
            );

            setLoading(false);

        }

    };

    /**
     * Fetch GitHub repos
     */
    const fetchRepos = async () => {

        try {

            const response =
                await axios.get(
                    '/api/repos'
                );

            setRepos(
                response.data || []
            );

        } catch (error) {

            console.error(
                'Failed to fetch repos:',
                error
            );

        }

    };

    /**
     * Fetch tracked repositories
     */
    const fetchTrackedRepos =
        async () => {

            try {

                const response =
                    await axios.get(
                        '/api/repos/tracked'
                    );

                setTrackedRepos(
                    response.data || []
                );

            } catch (error) {

                console.error(
                    'Failed to fetch tracked repos:',
                    error
                );

            }

        };

    /**
     * Fetch dashboard statistics
     */
    const fetchStats = async () => {

        try {

            const response =
                await axios.get(
                    '/api/stats/dashboard'
                );

            setStats(
                response.data
            );

        } catch (error) {

            console.error(
                'Failed to fetch stats:',
                error
            );

        }

    };

    /**
     * Track repository
     */
    const trackRepo = async (repo) => {

        try {

            await axios.post(
                '/api/repos',
                {
                    github_repo_id:
                        repo.id,

                    name:
                        repo.name,

                    full_name:
                        repo.full_name,

                    html_url:
                        repo.html_url,

                    description:
                        repo.description,
                }
            );

            await fetchTrackedRepos();
            await fetchStats();

        } catch (error) {

            console.error(
                'Failed to track repo:',
                error
            );

        }

    };

    /**
     * Sync commits
     */
    const syncCommits =
        async (repoId) => {

            try {

                await axios.post(
                    `/api/commits/sync/${repoId}`
                );

                await fetchStats();

                await fetchTrackedRepos();

                alert(
                    'Commits synced successfully!'
                );

            } catch (error) {

                console.error(
                    'Failed to sync commits:',
                    error
                );

                alert(
                    'Failed to sync commits'
                );

            }

        };

    /**
     * Loading UI
     */
    if (loading) {

        return (
            <div
                className="
                min-h-screen
                bg-gray-900
                flex
                items-center
                justify-center
            "
            >
                <div
                    className="
                    text-white
                    text-xl
                "
                >
                    Loading dashboard...
                </div>
            </div>
        );

    }

    return (

        <Layout>

            <div className="space-y-8">

                {/* Welcome Section */}

                <div>

                    <h1
                        className="
                        text-3xl
                        font-bold
                        text-white
                        mb-2
                    "
                    >
                        Welcome back,
                        {' '}
                        {user?.username || 'Developer'}!
                    </h1>

                    <p
                        className="
                        text-gray-400
                    "
                    >
                        Here's an overview
                        of your development activity
                    </p>

                </div>

                {/* Error */}

                {error && (

                    <div
                        className="
                        bg-red-900
                        border
                        border-red-700
                        rounded-lg
                        p-4
                    "
                    >
                        <p
                            className="
                            text-red-100
                        "
                        >
                            {error}
                        </p>
                    </div>

                )}

                {/* Stats */}

                <div
                    className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    lg:grid-cols-3
                    xl:grid-cols-4
                    gap-6
                "
                >

                    <StatsCard
                        title="Tracked Repos"
                        value={
                            stats?.trackedReposCount
                                ?.toLocaleString() || '0'
                        }
                        change={0}
                        icon="📁"
                    />

                    <StatsCard
                        title="Total Commits"
                        value={
                            stats?.totalCommitsAllTime
                                ?.toLocaleString() || '0'
                        }
                        change={0}
                        icon="💻"
                    />

                    <StatsCard
                        title="Active Days"
                        value={
                            stats?.activeDaysThisMonth
                                ?.toString() || '0'
                        }
                        change={0}
                        icon="📅"
                    />

                    <StatsCard
                        title="Weekly Activity"
                        value={`${stats?.totalCommitsThisWeek || 0} commits`}
                        change={0}
                        icon="🚀"
                    />

                    <StatsCard
                        title="Open PRs"
                        value={
                            stats?.totalPRsOpen
                                ?.toLocaleString() || '0'
                        }
                        change={0}
                        icon="🔄"
                    />

                    <StatsCard
                        title="Merged PRs"
                        value={
                            stats?.totalPRsMergedAllTime
                                ?.toLocaleString() || '0'
                        }
                        change={0}
                        icon="✅"
                    />

                </div>

                {/* GitHub Repositories */}

                <div>

                    <h2
                        className="
                        text-2xl
                        font-semibold
                        text-white
                        mb-6
                    "
                    >
                        Your GitHub Repositories
                    </h2>

                    <div
                        className="
                        grid
                        grid-cols-1
                        md:grid-cols-2
                        lg:grid-cols-3
                        gap-6
                    "
                    >

                        {repos?.length > 0 ? (

                            repos.map((repo) => (

                                <RepoCard
                                    key={repo.id}

                                    repo={repo}

                                    onTrack={trackRepo}

                                    isTracked={
                                        trackedRepos.some(
                                            tracked =>
                                                tracked.github_repo_id
                                                === repo.id
                                        )
                                    }
                                />

                            ))

                        ) : (

                            <div
                                className="
                                text-gray-400
                            "
                            >
                                No repositories found.
                            </div>

                        )}

                    </div>

                </div>

                {/* Tracked Repositories */}

                {trackedRepos?.length > 0 && (

                    <div>

                        <h2
                            className="
                            text-2xl
                            font-semibold
                            text-white
                            mb-6
                        "
                        >
                            Tracked Repositories
                        </h2>

                        <div
                            className="
                            grid
                            grid-cols-1
                            md:grid-cols-2
                            lg:grid-cols-3
                            gap-6
                        "
                        >

                            {trackedRepos.map(
                                (repo) => (

                                    <RepoCard
                                        key={repo.id}

                                        repo={repo}

                                        onSync={syncCommits}

                                        isTracked={true}
                                    />

                                )
                            )}

                        </div>

                    </div>

                )}

                {/* Recent Activity */}

                <div
                    className="
                    bg-gray-800
                    rounded-lg
                    p-6
                "
                >

                    <h2
                        className="
                        text-2xl
                        font-semibold
                        text-white
                        mb-6
                    "
                    >
                        Recent Activity
                    </h2>

                    <div
                        className="
                        text-gray-400
                        text-center
                        py-8
                    "
                    >
                        Recent commits and
                        pull requests will appear here.
                    </div>

                </div>

            </div>

        </Layout>

    );

};

export default Dashboard;