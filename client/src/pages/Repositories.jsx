import React, { useState, useEffect } from 'react';
import axios from '../api/axiosInstance';
import Layout from '../components/Layout';
import RepoCard from '../components/RepoCard';

const Repositories = () => {
    const [repos, setRepos] = useState([]);
    const [trackedRepos, setTrackedRepos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRepos();
        fetchTrackedRepos();
    }, []);

    const fetchRepos = async () => {
        try {
            const response = await axios.get('/api/repos');
            setRepos(response.data);
        } catch (error) {
            console.error('Failed to fetch repos:', error);
        }
    };

    const fetchTrackedRepos = async () => {
        try {
            const response = await axios.get('/api/repos/tracked');
            setTrackedRepos(response.data);
        } catch (error) {
            console.error('Failed to fetch tracked repos:', error);
        } finally {
            setLoading(false);
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

    const untrackRepo = async (repoId) => {
        try {
            await axios.delete(`/api/repos/${repoId}`);
            fetchTrackedRepos();
        } catch (error) {
            console.error('Failed to untrack repo:', error);
            alert('Failed to untrack repository');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl animate-pulse">Loading repositories...</div>
            </div>
        );
    }

    return (
        <Layout>
            <div className="space-y-8 max-w-7xl mx-auto pb-12">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Repositories</h1>
                    <p className="text-gray-400">Browse your GitHub repositories and track the ones you want to monitor.</p>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold text-white mb-6">Tracked Repositories</h2>
                    {trackedRepos.length === 0 ? (
                        <div className="bg-gray-800/40 border border-gray-750 rounded-xl p-8 text-center text-gray-400">
                            No tracked repositories yet. Track an available repository below to enable syncing and analytics.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {trackedRepos.map(repo => (
                                <RepoCard key={repo.id} repo={repo} onUntrack={untrackRepo} isTracked={true} />
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h2 className="text-2xl font-semibold text-white mb-6">Available Repositories</h2>
                    {repos.length === 0 ? (
                        <div className="text-gray-400">No repositories found on your GitHub account.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {repos.map(repo => (
                                <RepoCard
                                    key={repo.id}
                                    repo={repo}
                                    onTrack={trackRepo}
                                    isTracked={trackedRepos.some(t => t.github_repo_id === repo.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Repositories;
