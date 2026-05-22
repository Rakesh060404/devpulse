import crypto from 'crypto';
import pool from '../config/db.js';

/**
 * Verifies GitHub webhook signature using HMAC-SHA256
 * @param {string} signature - X-Hub-Signature-256 header value
 * @param {string} body - Raw request body
 * @param {string} secret - Webhook secret from environment
 * @returns {boolean} - Whether signature is valid
 */
export const verifyWebhookSignature = (signature, body, secret) => {
    if (!signature || !secret) {
        return false;
    }

    // Extract signature value (remove 'sha256=' prefix)
    const signatureValue = signature.replace('sha256=', '');

    // Create expected signature
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signatureValue, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch (error) {
        // Invalid signature format
        return false;
    }
};

/**
 * Maps GitHub commit payload to database format
 * @param {Object} commit - GitHub commit object
 * @param {number} repoId - Repository ID in our database
 * @returns {Array} - Mapped commit data for database insertion
 */
export const mapCommitData = (commit, repoId) => {
    return [
        repoId,
        commit.id || commit.sha,
        commit.message,
        commit.author?.name || commit.committer?.name || 'Unknown',
        new Date(commit.timestamp || commit.author?.date || commit.committer?.date),
    ];
};

/**
 * Maps GitHub PR payload to database format
 * @param {Object} pr - GitHub PR object
 * @param {number} repoId - Repository ID in our database
 * @returns {Array} - Mapped PR data for database insertion
 */
export const mapPRData = (pr, repoId) => {
    const createdAt = new Date(pr.created_at);
    const mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;
    const reviewTimeMinutes = mergedAt
        ? Math.floor((mergedAt - createdAt) / (1000 * 60))
        : null;

    return [
        repoId,
        pr.id,
        pr.title,
        pr.state,
        pr.additions || 0,
        pr.deletions || 0,
        createdAt,
        mergedAt,
        pr.user?.login || 'Unknown',
        JSON.stringify(pr.requested_reviewers?.map(r => r.login) || []),
        reviewTimeMinutes,
    ];
};

/**
 * Processes push webhook event
 * @param {Object} payload - GitHub webhook payload
 * @returns {Object} - Processing result
 */
export const processPushEvent = async (payload) => {
    try {
        const { repository, commits, ref } = payload;

        // Process pushes to any branch (developers may work on feature branches)
        // ref format: refs/heads/branch-name
        if (!ref || !ref.startsWith('refs/heads/')) {
            return { processed: false, reason: 'Not a branch push' };
        }

        // Find repository in our database
        const [repos] = await pool.query(
            'SELECT id FROM repositories WHERE github_repo_id = ?',
            [repository.id]
        );

        if (repos.length === 0) {
            return { processed: false, reason: 'Repository not tracked' };
        }

        const repoId = repos[0].id;

        // Map and insert commits
        const commitData = commits
            .filter(commit => commit.id && commit.message) // Filter valid commits
            .map(commit => mapCommitData(commit, repoId));

        if (commitData.length > 0) {
            await pool.query(
                `INSERT INTO commits (repo_id, sha, message, author, committed_at) VALUES ?
                 ON DUPLICATE KEY UPDATE sha = sha`,
                [commitData]
            );
        }

        return {
            processed: true,
            commitsProcessed: commitData.length,
            repoId,
            branch: ref.replace('refs/heads/', '')
        };

    } catch (error) {
        console.error('Error processing push event:', error);
        throw error;
    }
};

/**
 * Processes pull request webhook event
 * @param {Object} payload - GitHub webhook payload
 * @returns {Object} - Processing result
 */
export const processPREvent = async (payload) => {
    try {
        const { action, pull_request, repository } = payload;

        // Only process relevant PR actions
        const relevantActions = ['opened', 'closed', 'reopened'];
        if (!relevantActions.includes(action)) {
            return { processed: false, reason: `Action '${action}' not relevant` };
        }

        // Find repository in our database
        const [repos] = await pool.query(
            'SELECT id FROM repositories WHERE github_repo_id = ?',
            [repository.id]
        );

        if (repos.length === 0) {
            return { processed: false, reason: 'Repository not tracked' };
        }

        const repoId = repos[0].id;

        // Map and upsert PR data
        const prData = [mapPRData(pull_request, repoId)];

        await pool.query(
            `INSERT INTO pull_requests (repo_id, github_pr_id, title, state, additions, deletions, created_at, merged_at, user, reviewers, review_time_minutes) VALUES ?
             ON DUPLICATE KEY UPDATE
             title = VALUES(title),
             state = VALUES(state),
             additions = VALUES(additions),
             deletions = VALUES(deletions),
             merged_at = VALUES(merged_at),
             reviewers = VALUES(reviewers),
             review_time_minutes = VALUES(review_time_minutes)`,
            [prData]
        );

        return {
            processed: true,
            action,
            prId: pull_request.id,
            repoId
        };

    } catch (error) {
        console.error('Error processing PR event:', error);
        throw error;
    }
};

/**
 * Processes ping webhook event (webhook verification)
 * @param {Object} payload - GitHub webhook payload
 * @returns {Object} - Processing result
 */
export const processPingEvent = async (payload) => {
    const { repository, hook_id } = payload;

    console.log(`Webhook ping received for repository: ${repository?.full_name}, hook ID: ${hook_id}`);

    return {
        processed: true,
        message: 'Webhook ping acknowledged',
        repository: repository?.full_name,
        hookId: hook_id
    };
};