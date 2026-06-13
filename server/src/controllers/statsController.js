import pool from '../config/db.js';

/**
 * GET /api/stats/dashboard
 * Dashboard analytics for authenticated user
 */

export const getDashboardStats = async (req, res) => {

    try {

        /**
         * Validate authenticated user
         */
        if (!req.user || !req.user.id) {

            return res.status(401).json({
                error: 'Unauthorized',
            });

        }

        const userId = req.user.id;

        /**
         * Get tracked repositories
         */
        const [trackedRepos] = await pool.query(
            `
            SELECT id
            FROM repositories
            WHERE user_id = ?
            `,
            [userId]
        );

        /**
         * Extract repository IDs
         */
        const repoIds = trackedRepos.map(
            repo => parseInt(repo.id)
        );

        /**
         * No repositories tracked yet
         */
        if (repoIds.length === 0) {

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

        /**
         * Total tracked repositories
         */
        const trackedReposCount = repoIds.length;

        /**
         * Dynamic placeholders for SQL IN clause
         */
        const placeholders = repoIds
            .map(() => '?')
            .join(',');

        /**
         * Total commits all time
         */
        const [totalCommitsResult] = await pool.query(
            `
            SELECT COUNT(*) as count
            FROM commits
            WHERE repo_id IN (${placeholders})
            `,
            repoIds
        );

        const totalCommitsAllTime =
            totalCommitsResult[0]?.count || 0;

        /**
         * Commits this week
         */
        const weekAgo = new Date();

        weekAgo.setDate(
            weekAgo.getDate() - 7
        );

        const [weekCommitsResult] = await pool.query(
            `
            SELECT COUNT(*) as count
            FROM commits
            WHERE repo_id IN (${placeholders})
            AND committed_at >= ?
            `,
            [...repoIds, weekAgo]
        );

        const totalCommitsThisWeek =
            weekCommitsResult[0]?.count || 0;

        /**
         * Open pull requests
         */
        const [openPRsResult] = await pool.query(
            `
            SELECT COUNT(*) as count
            FROM pull_requests
            WHERE repo_id IN (${placeholders})
            AND state = 'open'
            `,
            repoIds
        );

        const totalPRsOpen =
            openPRsResult[0]?.count || 0;

        /**
         * Merged pull requests
         */
        const [mergedPRsResult] = await pool.query(
            `
            SELECT COUNT(*) as count
            FROM pull_requests
            WHERE repo_id IN (${placeholders})
            AND merged_at IS NOT NULL
            `,
            repoIds
        );

        const totalPRsMergedAllTime =
            mergedPRsResult[0]?.count || 0;

        /**
         * Closed but unmerged PRs
         */
        const [closedPRsResult] = await pool.query(
            `
            SELECT COUNT(*) as count
            FROM pull_requests
            WHERE repo_id IN (${placeholders})
            AND state = 'closed'
            AND merged_at IS NULL
            `,
            repoIds
        );

        const totalPRsClosed =
            closedPRsResult[0]?.count || 0;

        /**
         * Active development days this month
         */
        const monthAgo = new Date();

        monthAgo.setDate(
            monthAgo.getDate() - 30
        );

        const [activeDaysResult] = await pool.query(
            `
            SELECT COUNT(
                DISTINCT DATE(committed_at)
            ) as count
            FROM commits
            WHERE repo_id IN (${placeholders})
            AND committed_at >= ?
            `,
            [...repoIds, monthAgo]
        );

        const activeDaysThisMonth =
            activeDaysResult[0]?.count || 0;

        /**
         * Productivity trend calculation
         * Compare this week vs previous week
         */
        const twoWeeksAgo = new Date();

        twoWeeksAgo.setDate(
            twoWeeksAgo.getDate() - 14
        );

        const [lastWeekResult] = await pool.query(
            `
            SELECT COUNT(*) as count
            FROM commits
            WHERE repo_id IN (${placeholders})
            AND committed_at >= ?
            AND committed_at < ?
            `,
            [...repoIds, twoWeeksAgo, weekAgo]
        );

        const lastWeekCommits =
            lastWeekResult[0]?.count || 0;

        /**
         * Better UX-friendly productivity calculation
         */
        let productivityTrendPercent = 0;

        if (lastWeekCommits > 0) {

            productivityTrendPercent = Math.round(
                (
                    (
                        totalCommitsThisWeek
                        - lastWeekCommits
                    )
                    / lastWeekCommits
                ) * 100
            );

            /**
             * Prevent negative productivity values
             */
            productivityTrendPercent = Math.max(
                0,
                productivityTrendPercent
            );

        } else if (totalCommitsThisWeek > 0) {

            productivityTrendPercent = 100;

        } else {

            productivityTrendPercent = 0;

        }

        /**
         * Final analytics response
         */
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

        console.error(
            'Dashboard statistics error:',
            error
        );

        console.error(
            error.message
        );

        console.error(
            error.stack
        );

        res.status(500).json({
            error:
                'Failed to fetch dashboard statistics',
            details: error.message,
        });

    }

};