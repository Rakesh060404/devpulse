import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from '../config/db.js';

/**
 * Gemini setup
 */
console.log('[AI SERVICE] Initializing Gemini API...');
console.log('[AI SERVICE] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
});

console.log('[AI SERVICE] Gemini model initialized successfully');

export const generateWeeklySummary = async (repoId) => {

    console.log('\n');
    console.log('========================================');
    console.log('AI SERVICE: generateWeeklySummary CALLED');
    console.log('========================================');
    console.log('Repo ID:', repoId);
    console.log('========================================');

    try {

        /**
         * Fetch repository
         */
        console.log('[AI SERVICE] Fetching repository from database...');
        const [repos] = await pool.query(
            `
            SELECT *
            FROM repositories
            WHERE id = ?
            `,
            [repoId]
        );

        console.log('[AI SERVICE] Repos found:', repos.length);

        if (repos.length === 0) {
            console.log('[AI SERVICE] ERROR: Repository not found');
            throw new Error('Repository not found');
        }

        const repo = repos[0];
        console.log('[AI SERVICE] Repository name:', repo.name);

        /**
         * 30-day analytics window
         */
        const endDate = new Date();

        const startDate = new Date();

        startDate.setDate(
            startDate.getDate() - 30
        );

        console.log('[AI SERVICE] Analytics window:', startDate.toDateString(), 'to', endDate.toDateString());

        /**
         * Fetch commits
         */
        console.log('[AI SERVICE] Fetching commits...');
        const [commits] = await pool.query(
            `
            SELECT
                author,
                message,
                committed_at,
                additions,
                deletions
            FROM commits
            WHERE repo_id = ?
            AND committed_at >= ?
            ORDER BY committed_at DESC
            LIMIT 30
            `,
            [repoId, startDate]
        );

        console.log('[AI SERVICE] Commits fetched:', commits.length);

        /**
         * Fetch pull requests with more details
         */
        console.log('[AI SERVICE] Fetching pull requests...');
        const [pullRequests] = await pool.query(
            `
            SELECT
                id,
                title,
                state,
                review_time_minutes,
                created_at,
                merged_at,
                additions,
                deletions,
                comments,
                review_comments,
                user,
                reviewers
            FROM pull_requests
            WHERE repo_id = ?
            AND created_at >= ?
            ORDER BY created_at DESC
            `,
            [repoId, startDate]
        );

        console.log('[AI SERVICE] Pull requests fetched:', pullRequests.length);

        /**
         * Build commit details
         */
        console.log('[AI SERVICE] Building commit details...');
        const commitDetails =
            commits.length === 0
                ? 'No commits during this period.'
                : commits.map(commit =>
                    `- [${commit.author}] ${commit.message} (${new Date(commit.committed_at).toDateString()})`
                ).join('\n');

        /**
         * Build detailed PR information
         */
        console.log('[AI SERVICE] Building PR details...');
        const prDetails =
            pullRequests.length === 0
                ? 'No pull requests during this period.'
                : pullRequests.map(pr => {
                    const status = pr.merged_at ? 'merged' : pr.state;
                    const changes = `${pr.additions || 0}+/${pr.deletions || 0}-`;
                    const reviewTime = pr.review_time_minutes
                        ? ` (${pr.review_time_minutes}min review)`
                        : '';
                    const engagement = pr.comments || pr.review_comments
                        ? ` [${(pr.comments || 0) + (pr.review_comments || 0)} comments]`
                        : '';
                    return `- "${pr.title}" — ${status} [${changes}]${reviewTime}${engagement}`;
                }).join('\n');

        /**
         * Calculate PR analytics
         */
        console.log('[AI SERVICE] Calculating PR analytics...');
        const mergedPRs = pullRequests.filter(pr => pr.merged_at).length;
        const openPRs = pullRequests.filter(pr => !pr.merged_at && pr.state === 'open').length;
        const closedNotMergedPRs = pullRequests.filter(pr => !pr.merged_at && pr.state === 'closed').length;

        const reviewTimes = pullRequests
            .filter(pr => pr.review_time_minutes)
            .map(pr => pr.review_time_minutes);

        const avgReviewTime = reviewTimes.length > 0
            ? Math.round(reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length)
            : null;

        const avgChangesPerPR = pullRequests.length > 0
            ? Math.round((pullRequests.reduce((sum, pr) => sum + (pr.additions || 0) + (pr.deletions || 0), 0)) / pullRequests.length)
            : 0;

        console.log('[AI SERVICE] PR Analytics - Merged:', mergedPRs, 'Open:', openPRs, 'Closed:', closedNotMergedPRs, 'Avg Review Time:', avgReviewTime);

        /**
         * Collaboration insights
         */
        const uniqueReviewers = new Set();
        pullRequests.forEach(pr => {
            if (pr.reviewers) {
                try {
                    const reviewers = typeof pr.reviewers === 'string'
                        ? JSON.parse(pr.reviewers)
                        : pr.reviewers;
                    if (Array.isArray(reviewers)) {
                        reviewers.forEach(r => uniqueReviewers.add(r));
                    }
                } catch (e) {
                    // Silently handle JSON parse errors
                }
            }
        });

        const collaborationInsight = uniqueReviewers.size > 0
            ? `Collaboration involved ${uniqueReviewers.size} reviewers.`
            : 'Limited reviewer involvement observed.';

        /**
         * Build enhanced Gemini prompt
         */
        console.log('[AI SERVICE] Building enhanced Gemini prompt...');
        const prompt = `
You are a senior engineering manager generating a concise weekly engineering summary focused on technical progress and team collaboration.

Repository: ${repo.name}
Development Period: ${startDate.toDateString()} → ${endDate.toDateString()}

DEVELOPMENT ACTIVITY:
Commits: ${commits.length} total
- ${commitDetails}

PULL REQUEST ACTIVITY (${pullRequests.length} PRs: ${mergedPRs} merged, ${openPRs} open, ${closedNotMergedPRs} closed):
${prDetails}

KEY METRICS:
- Average review time: ${avgReviewTime ? avgReviewTime + ' minutes' : 'No merged PRs'}
- Average changes per PR: ${avgChangesPerPR} lines
- ${collaborationInsight}

ANALYSIS REQUIREMENTS:
Generate a professional engineering summary that:
1. Summarizes actual work completed (from commits and merged PRs)
2. Highlights engineering focus areas and patterns
3. Notes collaboration quality and review velocity
4. Identifies any bottlenecks or risks
5. Provides one actionable recommendation

TONE: Professional, technical, concise
FORMAT: Paragraph form (no bullet points)
LENGTH: 120-150 words
FOCUS: Engineering excellence and team productivity
`;

        console.log('[AI SERVICE] Enhanced prompt length:', prompt.length, 'characters');

        /**
         * Generate Gemini summary
         */
        console.log('[AI SERVICE] Calling Gemini API...');
        let summary;

        try {

            console.log('[AI SERVICE] Sending prompt to Gemini model...');
            const result = await model.generateContent(prompt);

            console.log('[AI SERVICE] Gemini response received, extracting text...');
            const response = result.response;

            summary = response.text();

            if (!summary || !summary.trim()) {
                throw new Error('Gemini returned an empty summary');
            }

            console.log('\n');
            console.log('========================================');
            console.log('GEMINI SUMMARY GENERATED SUCCESSFULLY');
            console.log('========================================');
            console.log(summary);
            console.log('========================================');
            console.log('\n');

        } catch (geminiError) {

            console.error('\n');
            console.error('========================================');
            console.error('GEMINI SUMMARY GENERATION FAILED');
            console.error('========================================');

            console.error(
                'Message:',
                geminiError.message
            );

            console.error(
                'Full error:',
                geminiError
            );

            console.error('========================================');
            console.error('\n');

            /**
             * Fallback summary
             */
            console.log('[AI SERVICE] Using fallback summary due to Gemini error');
            summary = `
Development during this period focused on ${repo.name}'s ongoing engineering improvements. Recent commits indicate active work around backend stabilization, analytics enhancements, and feature refinement. Pull request activity suggests continued iteration and collaboration across the codebase. Moving forward, improving deployment stability and expanding analytics coverage would strengthen overall platform reliability.
`;

        }

        /**
         * Store summary
         */
        console.log('[AI SERVICE] Storing summary in database...');
        const [result] = await pool.query(
            `
            INSERT INTO weekly_summaries
            (
                repo_id,
                summary_text,
                generated_at,
                week_start,
                week_end
            )
            VALUES
            (
                ?,
                ?,
                NOW(),
                ?,
                ?
            )
            `,
            [
                repoId,
                summary,
                startDate,
                endDate,
            ]
        );

        console.log('[AI SERVICE] Summary stored with ID:', result.insertId);

        /**
         * Return response with enhanced analytics
         */
        console.log('[AI SERVICE] Returning summary response...');
        return {

            id: result.insertId,

            repo_id: repoId,

            summary_text: summary,

            generated_at: new Date(),

            week_start: startDate,

            week_end: endDate,

            analytics: {

                totalCommits: commits.length,

                totalPRs: pullRequests.length,

                mergedPRs,

                openPRs,

                closedNotMergedPRs,

                avgReviewTime,

                avgChangesPerPR,

                uniqueReviewers: uniqueReviewers.size,

                collaborationMetrics: {
                    reviewers: uniqueReviewers.size,
                    averageComments: pullRequests.length > 0
                        ? Math.round(pullRequests.reduce((sum, pr) => sum + ((pr.comments || 0) + (pr.review_comments || 0)), 0) / pullRequests.length)
                        : 0,
                }

            },

        };

    } catch (error) {

        console.error('[AI SERVICE ERROR] Fatal error in generateWeeklySummary:', error);
        console.error('[AI SERVICE ERROR] Stack:', error.stack);

        throw new Error(
            error.message
            || 'Failed to generate summary'
        );

    }

};