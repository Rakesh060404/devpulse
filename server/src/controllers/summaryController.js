import pool from '../config/db.js';
import { generateWeeklySummary } from '../services/aiService.js';

export const generateSummary = async (req, res) => {
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

        // Generate AI summary (this may take time)
        const summary = await generateWeeklySummary(repoId);

        res.json({
            message: 'AI summary generated successfully',
            summary,
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message || 'Failed to generate AI summary',
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