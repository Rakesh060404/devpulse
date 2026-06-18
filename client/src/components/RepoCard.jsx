import React from 'react';
import { Link } from 'react-router-dom';

const RepoCard = ({ repo, onTrack, onSync, onUntrack, isTracked }) => {
    // Handle both GitHub repos (with stargazers_count) and tracked repos (with github_repo_id)
    const stars = repo?.stargazers_count ?? 0;
    const forks = repo?.forks_count ?? 0;
    const lastUpdate = repo?.updated_at || repo?.tracked_at || repo?.created_at;
    const lastUpdateDate = lastUpdate
        ? new Date(lastUpdate).toLocaleDateString()
        : 'N/A';

    return (
        <div className="bg-gray-800 border border-gray-750 rounded-xl p-6 hover:border-gray-700 hover:shadow-lg hover:shadow-blue-900/10 transition-all duration-300 flex flex-col justify-between h-full">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 mr-4">
                        {isTracked ? (
                            <Link to={`/repositories/${repo.id}`} className="block group">
                                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary-500 transition-colors truncate" title={repo?.name}>
                                    {repo?.name || 'Unknown'}
                                </h3>
                            </Link>
                        ) : (
                            <h3 className="text-lg font-semibold text-white mb-1 truncate" title={repo?.name}>
                                {repo?.name || 'Unknown'}
                            </h3>
                        )}
                        <p className="text-gray-400 text-sm truncate">{repo?.full_name || 'N/A'}</p>
                    </div>
                </div>
                {repo?.description && (
                    <p className="text-gray-300 text-sm mb-6 line-clamp-2" title={repo.description}>{repo.description}</p>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-400 border-t border-gray-700/50 pt-4">
                    <div className="flex items-center space-x-3">
                        <span>⭐ {stars.toLocaleString()}</span>
                        <span>🍴 {forks.toLocaleString()}</span>
                    </div>
                    <span>📅 {lastUpdateDate}</span>
                </div>

                <div className="flex space-x-2 pt-2">
                    {!isTracked && onTrack ? (
                        <button
                            onClick={() => onTrack(repo)}
                            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors duration-200"
                        >
                            Track Repository
                        </button>
                    ) : isTracked ? (
                        <>
                            {onSync && (
                                <button
                                    onClick={() => onSync(repo.id)}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg transition-colors text-sm"
                                >
                                    Sync
                                </button>
                            )}
                            <Link
                                to={`/repositories/${repo.id}`}
                                className="flex-1 bg-primary-600/20 hover:bg-primary-600 text-primary-400 hover:text-white font-medium px-3 py-2 rounded-lg transition-all text-sm text-center flex items-center justify-center"
                            >
                                Analytics
                            </Link>
                            {onUntrack && (
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Are you sure you want to untrack ${repo.name}?`)) {
                                            onUntrack(repo.id);
                                        }
                                    }}
                                    className="p-2 bg-red-900/20 hover:bg-red-900/80 text-red-400 hover:text-red-100 rounded-lg transition-all"
                                    title="Untrack Repository"
                                >
                                    🗑️
                                </button>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default RepoCard;