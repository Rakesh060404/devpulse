import OpenAI from 'openai';
import pool from '../config/db.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const generateWeeklySummary = async (repoId) => {
    try {
        // Fetch repository info
        const [repos] = await pool.query(
            'SELECT * FROM repositories WHERE id = ?',
            [repoId]
        );

        if (repos.length === 0) {
            throw new Error('Repository not found');
        }

        const repo = repos[0];

        // Get date range for last week
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        // Fetch commits for the week
        const [commits] = await pool.query(
            'SELECT COUNT(*) as count, author, SUM(1) as contributions FROM commits WHERE repo_id = ? AND committed_at >= ? AND committed_at <= ? GROUP BY author ORDER BY contributions DESC',
            [repoId, startDate, endDate]
        );

        // Fetch PRs for the week
        const [prs] = await pool.query(
            'SELECT COUNT(*) as total_prs, SUM(CASE WHEN state = "closed" AND merged_at IS NOT NULL THEN 1 ELSE 0 END) as merged_prs, AVG(review_time_minutes) as avg_review_time FROM pull_requests WHERE repo_id = ? AND created_at >= ? AND created_at <= ?',
            [repoId, startDate, endDate]
        );

        // Fetch total additions/deletions
        const [changes] = await pool.query(
            'SELECT SUM(additions) as total_additions, SUM(deletions) as total_deletions FROM pull_requests WHERE repo_id = ? AND created_at >= ? AND created_at <= ?',
            [repoId, startDate, endDate]
        );

        // Aggregate data
        const analytics = {
            repoName: repo.name,
            period: {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0],
            },
            commits: {
                total: commits.reduce((sum, c) => sum + (c.contributions || 0), 0),
                topContributors: commits.slice(0, 5),
            },
            prs: {
                total: prs[0]?.total_prs || 0,
                merged: prs[0]?.merged_prs || 0,
                avgReviewTime: prs[0]?.avg_review_time ? Math.round(prs[0].avg_review_time) : null,
            },
            changes: {
                additions: changes[0]?.total_additions || 0,
                deletions: changes[0]?.total_deletions || 0,
            },
        };

        // Build prompt
        const prompt = buildSummaryPrompt(analytics);

        // Generate summary with OpenAI
        const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        let summary;
        let openAiError;

        try {
            const completion = await attemptOpenAiCompletion(openAiModel, prompt);
            summary = completion.choices[0]?.message?.content?.trim();

            if (!summary) {
                throw new Error('OpenAI returned no summary text');
            }
        } catch (error) {
            openAiError = error;
            console.warn('OpenAI error:', { code: error?.error?.code, message: error.message });

            // Try fallback models based on error type
            if (isModelError(error) && openAiModel !== 'gpt-4o-mini') {
                console.log('Model not found, trying gpt-4o-mini fallback...');
                try {
                    const completion = await attemptOpenAiCompletion('gpt-4o-mini', prompt);
                    summary = completion.choices[0]?.message?.content?.trim();
                } catch (retryError) {
                    openAiError = retryError;
                    console.warn('Fallback model also failed:', retryError.message);
                }
            }

            // If still no summary, we'll use template
            if (!summary && isQuotaError(error)) {
                console.warn('OpenAI quota exceeded - using template');
                openAiError = new Error('OpenAI quota exceeded');
            }

            if (!summary && isRateLimitError(error)) {
                console.warn('OpenAI rate limited - using template');
                openAiError = new Error('OpenAI rate limit exceeded');
            }
        }

        if (!summary) {
            console.warn('OpenAI summary generation failed; using fallback summary.', openAiError?.message);
            summary = buildFallbackSummary(analytics, openAiError);
        }

        // Store summary in database
        const [result] = await pool.query(
            'INSERT INTO weekly_summaries (repo_id, summary_text, generated_at, week_start, week_end) VALUES (?, ?, NOW(), ?, ?)',
            [repoId, summary, startDate, endDate]
        );

        return {
            id: result.insertId,
            repo_id: repoId,
            summary_text: summary,
            generated_at: new Date(),
            week_start: startDate,
            week_end: endDate,
            analytics,
        };

    } catch (error) {
        console.error('AI Summary generation failed:', error);
        throw new Error(error.message || 'Failed to generate AI summary');
    }
};

const attemptOpenAiCompletion = async (model, prompt) => {
    return openai.chat.completions.create({
        model,
        messages: [
            {
                role: 'system',
                content: 'You are an expert engineering analyst creating weekly development summaries. Write in a professional, insightful tone like a senior engineering manager. Focus on productivity, collaboration, and development patterns.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        max_tokens: 1000,
        temperature: 0.7,
    });
};

const isRateLimitError = (error) => {
    const errorCode = error?.error?.code || error?.code;
    return errorCode === 'rate_limit_exceeded' ||
        error?.status === 429 ||
        (error?.message && error.message.includes('rate limit'));
};

const isQuotaError = (error) => {
    const errorCode = error?.error?.code || error?.code;
    return errorCode === 'insufficient_quota' ||
        (error?.message && error.message.includes('quota'));
};

const isModelError = (error) => {
    const errorCode = error?.error?.code || error?.code;
    return errorCode === 'model_not_found' ||
        (error?.message && error.message.includes('model'));
};

const buildFallbackSummary = (analytics, error) => {
    const reason = error?.code ? ` (${error.code})` : '';

    return `Automated weekly summary${reason}:

Over the period ${analytics.period.start} to ${analytics.period.end}, the ${analytics.repoName} repository maintained steady activity. The team completed ${analytics.commits.total} commits, led by ${analytics.commits.topContributors.length > 0 ? analytics.commits.topContributors.map(c => c.author).join(', ') : 'contributors'}.

Pull request activity included ${analytics.prs.total} total PRs with ${analytics.prs.merged} merges and an average review time of ${analytics.prs.avgReviewTime ? `${analytics.prs.avgReviewTime} minutes` : 'N/A'}. Code changes for the week totaled +${analytics.changes.additions} additions and -${analytics.changes.deletions} deletions.

This summary reflects development momentum, collaboration patterns, and review throughput based on available repository analytics.`;
};

const buildSummaryPrompt = (analytics) => {
    return `
Generate a professional weekly engineering summary for the repository "${analytics.repoName}" covering the period ${analytics.period.start} to ${analytics.period.end}.

Key Metrics:
- Total Commits: ${analytics.commits.total}
- Top Contributors: ${analytics.commits.topContributors.map(c => `${c.author} (${c.contributions} commits)`).join(', ')}
- Total PRs: ${analytics.prs.total}
- Merged PRs: ${analytics.prs.merged}
- Average Review Time: ${analytics.prs.avgReviewTime ? `${analytics.prs.avgReviewTime} minutes` : 'N/A'}
- Code Changes: +${analytics.changes.additions} additions, -${analytics.changes.deletions} deletions

Please write a comprehensive summary that includes:
1. Overall development activity level
2. Key contributors and their impact
3. Code review and collaboration patterns
4. Development focus areas based on changes
5. Productivity insights and recommendations
6. Any notable patterns or trends

Write in a professional engineering report style, approximately 300-500 words.
`;
};