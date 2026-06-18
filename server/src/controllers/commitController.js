import pool from "../config/db.js";
import { fetchRepoCommits } from "../services/githubService.js";

export const syncRepoCommits = async (req, res) => {
    try {
        const userId = req.user.id;
        const repoId = req.params.repoId;

        // Check if repo is tracked by user
        const [repos] = await pool.query(
            "SELECT * FROM repositories WHERE id = ? AND user_id = ?",
            [repoId, userId]
        );

        if (repos.length === 0) {
            return res.status(404).json({
                error: "Tracked repository not found",
            });
        }

        const repo = repos[0];
        const [owner, repoName] = repo.full_name.split('/');

        // Get user access token
        const [users] = await pool.query(
            "SELECT access_token FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        const accessToken = users[0].access_token;

        // Fetch repo metadata from GitHub and update in DB
        try {
            const { fetchRepoMetadata } = await import("../services/githubService.js");
            const githubRepo = await fetchRepoMetadata(accessToken, owner, repoName);
            await pool.query(
                `UPDATE repositories 
                 SET stargazers_count = ?, forks_count = ?, language = ?, watchers_count = ?, open_issues_count = ?
                 WHERE id = ?`,
                [
                    githubRepo.stargazers_count || 0,
                    githubRepo.forks_count || 0,
                    githubRepo.language || null,
                    githubRepo.watchers_count || 0,
                    githubRepo.open_issues_count || 0,
                    repoId
                ]
            );
        } catch (err) {
            console.warn(`Failed to update metadata during sync: ${err.message}`);
        }

        // Fetch commits (for MVP, fetch first page)
        const commits = await fetchRepoCommits(accessToken, owner, repoName);

        // Map and bulk insert, avoiding duplicates
        const commitData = commits.map(commit => [
            repoId,
            commit.sha,
            commit.commit.message,
            commit.commit.author?.name || commit.author?.login || 'Unknown',
            new Date(commit.commit.author?.date || commit.commit.committer?.date),
        ]);

        if (commitData.length > 0) {
            // Use INSERT IGNORE or ON DUPLICATE KEY UPDATE to avoid duplicates
            await pool.query(
                `INSERT INTO commits (repo_id, sha, message, author, committed_at) VALUES ?
                 ON DUPLICATE KEY UPDATE sha = sha`, // No-op to ignore duplicates
                [commitData]
            );
        }

        res.json({
            message: "Commits synced successfully",
            syncedCount: commitData.length,
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to sync commits",
        });
    }
};

export const getRepoCommits = async (req, res) => {
    try {
        const userId = req.user.id;
        const repoId = req.params.repoId;

        // Check if repo is tracked by user
        const [repos] = await pool.query(
            "SELECT id FROM repositories WHERE id = ? AND user_id = ?",
            [repoId, userId]
        );

        if (repos.length === 0) {
            return res.status(404).json({
                error: "Tracked repository not found",
            });
        }

        // Get commits for the repository
        const [commits] = await pool.query(
            "SELECT id, sha, message, author, DATE_FORMAT(committed_at, '%Y-%m-%d') as date FROM commits WHERE repo_id = ? ORDER BY committed_at DESC LIMIT 100",
            [repoId]
        );

        res.json(commits);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch commits",
        });
    }
};