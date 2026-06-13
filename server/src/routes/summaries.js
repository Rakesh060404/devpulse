import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { generateSummary, getSummaries } from '../controllers/summaryController.js';

const router = express.Router();

console.log('[ROUTES] Summary routes loaded');

router.post('/generate/:repoId', authMiddleware, (req, res, next) => {
    console.log('\n');
    console.log('========================================');
    console.log('ROUTE HIT: POST /api/summaries/generate/:repoId');
    console.log('========================================');
    console.log('Repo ID from URL:', req.params.repoId);
    console.log('Auth header exists:', !!req.headers.authorization);
    console.log('========================================');
    next();
}, generateSummary);

router.get('/:repoId', authMiddleware, (req, res, next) => {
    console.log('[ROUTES] GET /api/summaries/:repoId hit');
    next();
}, getSummaries);

export default router;