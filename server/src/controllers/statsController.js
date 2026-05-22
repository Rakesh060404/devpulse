import pool from '../config/db.js';

/**
 * Get aggregated dashboard statistics for authenticated user
 * GET /api/stats/dashboard
 * 
 * Returns:
 * - Total tracked repositories
 * - Total commits (all time & this week)
 * - Total PRs (open, merged, all time)
 * - Active days this month
 * - Productivity trends
 */
export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get count of tracked repos
        const [trackedRepos] = await pool.query(
            'SELECT COUNT(*) as count FROM repositories WHERE user_id = ?',
            [userId]
        );
        const trackedReposCount = trackedRepos[0]?.count || 0;

        // Get repo IDs for this user
        const [userRepos] = await pool.query(
            'SELECT id FROM repositories WHERE user_id = ?',
            [userId]
        );
        const repoIds = userRepos.map(r => r.id);

        if (repoIds.length === 0) {
            // No tracked repos - return zeros
            return res.json({
                trackedReposCount: 0,
                totalCommitsAllTime: 0,
                totalCommitsThisWeek: 0,
                totalPRsOpen: 0,
                totalPRsMergedAllTime: 0,
                totalPRsClosed: 0,
                activeDaysThisMonth: 0,
                productivityTrendPercent: 0,
            });
        }

        // Total commits all time
        const [totalCommits] = await pool.query(
            `SELECT COUNT(*) as count FROM commits WHERE repo_id IN (${repoIds.join(',')})`,
        );
        const totalCommitsAllTime = totalCommits[0]?.count || 0;

        // Commits this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const [weekCommits] = await pool.query(
            `SELECT COUNT(*) as count FROM commits WHERE repo_id IN (${repoIds.join(',')}) AND committed_at >= ?`,
            [weekAgo]
        );
        const totalCommitsThisWeek = weekCommits[0]?.count || 0;

        // PRs open
        const [openPRs] = await pool.query(
            `SELECT COUNT(*) as count FROM pull_requests WHERE repo_id IN (${repoIds.join(',')}) AND state = 'open'`,
        );
        const totalPRsOpen = openPRs[0]?.count || 0;

        // PRs merged all time
        const [mergedPRs] = await pool.query(
            `SELECT COUNT(*) as count FROM pull_requests WHERE repo_id IN (${repoIds.join(',')}) AND state = 'closed' AND merged_at IS NOT NULL`,
        );
        const totalPRsMergedAllTime = mergedPRs[0]?.count || 0;

        // PRs closed (not merged)
        const [closedPRs] = await pool.query(
            `SELECT COUNT(*) as count FROM pull_requests WHERE repo_id IN (${repoIds.join(',')}) AND state = 'closed' AND merged_at IS NULL`,
        );
        const totalPRsClosed = closedPRs[0]?.count || 0;

        // Active days this month
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const [activeDays] = await pool.query(
            `SELECT COUNT(DISTINCT DATE(committed_at)) as count FROM commits WHERE repo_id IN (${repoIds.join(',')}) AND committed_at >= ?`,
            [monthAgo]
        );
        const activeDaysThisMonth = activeDays[0]?.count || 0;

        // Productivity trend: compare this week vs last week
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const [lastWeekCommits] = await pool.query(
            `SELECT COUNT(*) as count FROM commits WHERE repo_id IN (${repoIds.join(',')}) AND committed_at >= ? AND committed_at < ?`,
            [twoWeeksAgo, weekAgo]
        );
        const lastWeekCount = lastWeekCommits[0]?.count || 0;
        let productivityTrendPercent = 0;
        if (lastWeekCount > 0) {
            productivityTrendPercent = Math.round(((totalCommitsThisWeek - lastWeekCount) / lastWeekCount) * 100);
        } else if (totalCommitsThisWeek > 0) {
            productivityTrendPercent = 100; // Previous week had 0, this week has > 0
        }

        res.json({
            trackedReposCount,
            totalCommitsAllTime,
            totalCommitsThisWeek,
            totalPRsOpen,
            totalPRsMergedAllTime,
            totalPRsClosed,
            activeDaysThisMonth,
            productivityTrendPercent,
        });

    } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard statistics',
            details: error.message,
        });
    }
};
