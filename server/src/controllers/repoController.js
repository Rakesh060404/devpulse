import pool from "../config/db.js";
import { fetchUserRepos } from "../services/githubService.js";

export const getUserRepos = async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await pool.query(
            "SELECT * FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        const user = users[0];

        if (!user.access_token) {

            return res.status(401).json({
                error: "GitHub access token missing. Please login again."
            });

        }

        const repos = await fetchUserRepos(
            user.access_token
        );

        res.json(repos);

    } catch (error) {
        console.error(error);

        if (error.response?.status === 401) {
            return res.status(401).json({
                error: "GitHub access token expired or invalid. Please log out and sign in again.",
            });
        }

        res.status(500).json({
            error: "Failed to fetch repositories",
        });
    }
};

export const addTrackedRepo = async (req, res) => {
    try {
        const userId = req.user.id;
        const { github_repo_id, name, full_name, html_url, description } = req.body;

        if (!github_repo_id || !name || !full_name) {
            return res.status(400).json({
                error: "Missing required fields: github_repo_id, name, full_name",
            });
        }

        // Check if already tracked
        const [existing] = await pool.query(
            "SELECT id FROM repositories WHERE user_id = ? AND github_repo_id = ?",
            [userId, github_repo_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                error: "Repository already tracked",
            });
        }

        // Fetch user access token to get repository metadata from GitHub
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
        const [owner, repoName] = full_name.split('/');

        let stargazers_count = 0;
        let forks_count = 0;
        let language = null;
        let watchers_count = 0;
        let open_issues_count = 0;

        try {
            const { fetchRepoMetadata } = await import("../services/githubService.js");
            const githubRepo = await fetchRepoMetadata(accessToken, owner, repoName);
            stargazers_count = githubRepo.stargazers_count || 0;
            forks_count = githubRepo.forks_count || 0;
            language = githubRepo.language || null;
            watchers_count = githubRepo.watchers_count || 0;
            open_issues_count = githubRepo.open_issues_count || 0;
        } catch (err) {
            console.warn(`Failed to fetch metadata during track: ${err.message}`);
        }

        // Insert new tracked repo
        const [result] = await pool.query(
            `INSERT INTO repositories 
             (user_id, github_repo_id, name, full_name, html_url, description, stargazers_count, forks_count, language, watchers_count, open_issues_count) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, 
                github_repo_id, 
                name, 
                full_name, 
                html_url || null, 
                description || null,
                stargazers_count,
                forks_count,
                language,
                watchers_count,
                open_issues_count
            ]
        );

        res.status(201).json({
            message: "Repository tracked successfully",
            repoId: result.insertId,
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to track repository",
        });
    }
};

export const deleteTrackedRepo = async (req, res) => {
    try {
        const userId = req.user.id;
        const repoId = req.params.id;

        // Check if repo exists and belongs to user
        const [existing] = await pool.query(
            "SELECT id FROM repositories WHERE id = ? AND user_id = ?",
            [repoId, userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                error: "Tracked repository not found",
            });
        }

        // Delete repo (cascade will handle commits if set up)
        await pool.query(
            "DELETE FROM repositories WHERE id = ? AND user_id = ?",
            [repoId, userId]
        );

        res.json({
            message: "Repository untracked successfully",
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to untrack repository",
        });
    }
};

export const getRepo = async (req, res) => {
    try {
        const userId = req.user.id;
        const repoId = req.params.id;

        // Check if repo is tracked by user
        const [repos] = await pool.query(
            `SELECT id, github_repo_id, name, full_name, html_url, description, 
                    stargazers_count, forks_count, language, watchers_count, open_issues_count, 
                    created_at, tracked_at, updated_at 
             FROM repositories 
             WHERE id = ? AND user_id = ?`,
            [repoId, userId]
        );

        if (repos.length === 0) {
            return res.status(404).json({
                error: "Tracked repository not found",
            });
        }

        const repo = repos[0];

        // Fetch GitHub metadata
        try {
            const [users] = await pool.query(
                "SELECT access_token FROM users WHERE id = ?",
                [userId]
            );

            if (users.length > 0) {
                const accessToken = users[0].access_token;
                const [owner, repoName] = repo.full_name.split('/');

                const githubRepo = await fetchGitHubRepoMetadata(accessToken, owner, repoName);

                // Enrich repo with GitHub data
                repo.stargazers_count = githubRepo.stargazers_count || 0;
                repo.forks_count = githubRepo.forks_count || 0;
                repo.language = githubRepo.language || null;
                repo.watchers_count = githubRepo.watchers_count || 0;
                repo.open_issues_count = githubRepo.open_issues_count || 0;
            }
        } catch (githubError) {
            console.warn('Failed to fetch GitHub metadata for repo', repoId, githubError.message);
            // Continue with basic repo data if GitHub fetch fails
        }

        res.json(repo);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch repository",
        });
    }
};

/**
 * Helper function to fetch repository metadata from GitHub
 */
const fetchGitHubRepoMetadata = async (accessToken, owner, repo) => {
    const { fetchRepoMetadata } = await import("../services/githubService.js");
    return fetchRepoMetadata(accessToken, owner, repo);
};

export const getTrackedRepos = async (req, res) => {
    try {
        const userId = req.user.id;

        const [repos] = await pool.query(
            `SELECT id, github_repo_id, name, full_name, html_url, description, 
                    stargazers_count, forks_count, language, watchers_count, open_issues_count, 
                    created_at, tracked_at, updated_at 
             FROM repositories 
             WHERE user_id = ?`,
            [userId]
        );

        res.json(repos);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch tracked repositories",
        });
    }
};