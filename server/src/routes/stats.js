import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getDashboardStats, getRecentActivity } from '../controllers/statsController.js';

const router = express.Router();

router.get(
    '/dashboard',
    authMiddleware,
    getDashboardStats
);

router.get(
    '/recent-activity',
    authMiddleware,
    getRecentActivity
);

export default router;