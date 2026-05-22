import React from 'react';

const RepoCard = ({ repo, onTrack, onSync, isTracked }) => {
    // Handle both GitHub repos (with stargazers_count) and tracked repos (with github_repo_id)
    const stars = repo?.stargazers_count ?? 0;
    const forks = repo?.forks_count ?? 0;
    const lastUpdate = repo?.updated_at || repo?.tracked_at || repo?.created_at;
    const lastUpdateDate = lastUpdate
        ? new Date(lastUpdate).toLocaleDateString()
        : 'N/A';

    return (
        <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{repo?.name || 'Unknown'}</h3>
                    <p className="text-gray-400 text-sm">{repo?.full_name || 'N/A'}</p>
                </div>
                <div className="flex space-x-2">
                    {!isTracked && onTrack ? (
                        <button
                            onClick={() => onTrack(repo)}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Track
                        </button>
                    ) : isTracked && onSync ? (
                        <button
                            onClick={() => onSync(repo.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Sync Commits
                        </button>
                    ) : null}
                </div>
            </div>
            {repo?.description && (
                <p className="text-gray-300 text-sm mb-4">{repo.description}</p>
            )}
            <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>⭐ {stars.toLocaleString()}</span>
                <span>🍴 {forks.toLocaleString()}</span>
                <span>📅 {lastUpdateDate}</span>
            </div>
        </div>
    );
};

export default RepoCard;