import pool from '../config/db.js';
import { generateWeeklySummary } from '../services/aiService.js';

console.log('========================================');
console.log('SUMMARY CONTROLLER MODULE LOADED');
console.log('========================================');

export const generateSummary = async (req, res) => {
    console.log('\n');
    console.log('========================================');
    console.log('SUMMARY GENERATE ROUTE HIT');
    console.log('========================================');
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('User ID:', req.user?.id);
    console.log('Repo ID from params:', req.params.repoId);
    console.log('========================================');

    try {
        const userId = req.user.id;
        const repoId = req.params.repoId;

        console.log('[DEBUG] Checking if repo is tracked by user...');
        // Check if repo is tracked by user
        const [repos] = await pool.query(
            'SELECT id FROM repositories WHERE id = ? AND user_id = ?',
            [repoId, userId]
        );

        console.log('[DEBUG] Repos found:', repos.length);

        if (repos.length === 0) {
            console.log('[DEBUG] Repository not found or not tracked by user');
            return res.status(404).json({
                error: 'Tracked repository not found',
            });
        }

        console.log('[DEBUG] Repository verified. Calling generateWeeklySummary...');
        // Generate AI summary (this may take time)
        const summary = await generateWeeklySummary(repoId);

        console.log('[DEBUG] Summary generated successfully. Returning response...');
        res.json({
            message: 'AI summary generated successfully',
            summary,
        });

    } catch (error) {
        console.error('[ERROR] Error in generateSummary:', error);
        console.error('[ERROR] Error stack:', error.stack);

        res.status(500).json({
            error: error.message || 'Failed to generate AI summary',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const getSummaries = async (req, res) => {
    try {
        const userId = req.user.id;
        const repoId = req.params.repoId;

        // Check if repo is tracked by user
        const [repos] = await pool.query(
            'SELECT id FROM repositories WHERE id = ? AND user_id = ?',
            [repoId, userId]
        );

        if (repos.length === 0) {
            return res.status(404).json({
                error: 'Tracked repository not found',
            });
        }

        // Fetch summaries for the repo
        const [summaries] = await pool.query(
            'SELECT * FROM weekly_summaries WHERE repo_id = ? ORDER BY generated_at DESC',
            [repoId]
        );

        res.json(summaries);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'Failed to fetch summaries',
        });
    }
};