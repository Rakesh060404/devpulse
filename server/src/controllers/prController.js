import pool from "../config/db.js";
import { fetchRepoPRs } from "../services/githubService.js";

export const syncRepoPRs = async (req, res) => {
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

        // Fetch all PRs with pagination handling
        let allPrs = [];
        let page = 1;
        const perPage = 100;
        let hasMore = true;

        console.log(`[PR SYNC] Starting pagination fetch for ${repo.full_name}`);

        while (hasMore) {
            try {
                const prs = await fetchRepoPRs(accessToken, owner, repoName, 'all', page, perPage);

                if (!prs || prs.length === 0) {
                    hasMore = false;
                    break;
                }

                allPrs = allPrs.concat(prs);
                console.log(`[PR SYNC] Page ${page}: fetched ${prs.length} PRs`);

                if (prs.length < perPage) {
                    hasMore = false;
                }

                page++;
            } catch (pageError) {
                console.error(`[PR SYNC] Error fetching page ${page}:`, pageError.message);
                hasMore = false;
            }
        }

        console.log(`[PR SYNC] Total PRs fetched: ${allPrs.length}`);

        // Map and bulk insert, avoiding duplicates
        const prData = allPrs.map(pr => {
            // Calculate review time: merged_at - created_at
            let reviewTimeMinutes = null;
            if (pr.merged_at) {
                const mergedDate = new Date(pr.merged_at);
                const createdDate = new Date(pr.created_at);
                reviewTimeMinutes = Math.floor((mergedDate - createdDate) / (1000 * 60));
            }

            return [
                repoId,
                pr.id,
                pr.title,
                pr.state, // 'open' or 'closed'
                pr.additions || 0,
                pr.deletions || 0,
                pr.changed_files || 0,
                pr.comments || 0,
                pr.review_comments || 0,
                new Date(pr.created_at),
                pr.merged_at ? new Date(pr.merged_at) : null,
                pr.closed_at ? new Date(pr.closed_at) : null,
                pr.user.login,
                JSON.stringify(pr.requested_reviewers?.map(r => r.login) || []),
                reviewTimeMinutes,
            ];
        });

        if (prData.length > 0) {
            // Use ON DUPLICATE KEY UPDATE to handle duplicates
            await pool.query(
                `INSERT INTO pull_requests 
                 (repo_id, github_pr_id, title, state, additions, deletions, changed_files, comments, review_comments, created_at, merged_at, closed_at, user, reviewers, review_time_minutes) 
                 VALUES ? 
                 ON DUPLICATE KEY UPDATE
                 title = VALUES(title),
                 state = VALUES(state),
                 additions = VALUES(additions),
                 deletions = VALUES(deletions),
                 changed_files = VALUES(changed_files),
                 comments = VALUES(comments),
                 review_comments = VALUES(review_comments),
                 merged_at = VALUES(merged_at),
                 closed_at = VALUES(closed_at),
                 reviewers = VALUES(reviewers),
                 review_time_minutes = VALUES(review_time_minutes)`,
                [prData]
            );

            console.log(`[PR SYNC] Inserted/updated ${prData.length} PRs`);
        }

        res.json({
            message: "Pull requests synced successfully",
            syncedCount: prData.length,
            pages: page - 1,
        });

    } catch (error) {
        console.error('[PR SYNC] Error:', error);

        res.status(500).json({
            error: "Failed to sync pull requests",
            details: error.message,
        });
    }
};

export const getRepoPRs = async (req, res) => {
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

        // Fetch PRs for the repo
        const [prs] = await pool.query(
            "SELECT * FROM pull_requests WHERE repo_id = ? ORDER BY created_at DESC",
            [repoId]
        );

        res.json(prs);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch pull requests",
        });
    }
};

export const getRepoPRAnalytics = async (req, res) => {
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

        // Compute analytics
        const [totalPRs] = await pool.query(
            "SELECT COUNT(*) as total FROM pull_requests WHERE repo_id = ?",
            [repoId]
        );

        const [openPRs] = await pool.query(
            "SELECT COUNT(*) as open FROM pull_requests WHERE repo_id = ? AND state = 'open'",
            [repoId]
        );

        // Merged PRs: state='closed' AND merged_at IS NOT NULL
        const [mergedPRs] = await pool.query(
            "SELECT COUNT(*) as merged FROM pull_requests WHERE repo_id = ? AND state = 'closed' AND merged_at IS NOT NULL",
            [repoId]
        );

        // Average review time (only for merged PRs)
        const [avgReviewTime] = await pool.query(
            "SELECT AVG(review_time_minutes) as avg_time FROM pull_requests WHERE repo_id = ? AND review_time_minutes IS NOT NULL AND merged_at IS NOT NULL",
            [repoId]
        );

        // Closed but not merged (rejected/abandoned)
        const [closedNotMerged] = await pool.query(
            "SELECT COUNT(*) as closed FROM pull_requests WHERE repo_id = ? AND state = 'closed' AND merged_at IS NULL",
            [repoId]
        );

        const analytics = {
            totalPRs: totalPRs[0]?.total || 0,
            openPRs: openPRs[0]?.open || 0,
            mergedPRs: mergedPRs[0]?.merged || 0,
            closedNotMergedPRs: closedNotMerged[0]?.closed || 0,
            avgReviewTimeMinutes: avgReviewTime[0]?.avg_time ? Math.round(avgReviewTime[0].avg_time) : null,
        };

        res.json(analytics);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch PR analytics",
        });
    }
};

/**
 * GET /api/prs/stats/:repoId
 * Alias for getRepoPRAnalytics to match requirements
 */
export const getRepoPRStats = getRepoPRAnalytics;

/**
 * GET /api/prs/:repoId/weekly-stats
 * Get weekly PR statistics for charts
 */
export const getWeeklyPRStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const repoId = req.params.repoId;
        const weeks = parseInt(req.query.weeks) || 12;

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

        // Get weekly PR creation and merge stats (MySQL/TiDB compatible query)
        const [weeklyStats] = await pool.query(
            `SELECT 
                DATE_FORMAT(DATE_SUB(created_at, INTERVAL DAYOFWEEK(created_at) - 1 DAY), '%Y-%m-%d') as week_start,
                COUNT(*) as prs_created,
                SUM(CASE WHEN state = 'closed' AND merged_at IS NOT NULL THEN 1 ELSE 0 END) as prs_merged,
                AVG(review_time_minutes) as avg_review_time
            FROM pull_requests
            WHERE repo_id = ? 
            AND created_at >= DATE_SUB(NOW(), INTERVAL ? WEEK)
            GROUP BY week_start
            ORDER BY week_start DESC`,
            [repoId, weeks]
        );

        const formattedStats = (weeklyStats || []).map(row => ({
            week_start: row.week_start,
            prs_created: Number(row.prs_created || 0),
            prs_merged: Number(row.prs_merged || 0),
            avg_review_time: row.avg_review_time ? Number(Number(row.avg_review_time).toFixed(2)) : null
        }));

        res.json(formattedStats);

    } catch (error) {
        console.error('Failed to fetch weekly PR stats:', error);
        res.status(500).json({
            error: "Failed to fetch weekly PR stats",
            details: error.message
        });
    }
};