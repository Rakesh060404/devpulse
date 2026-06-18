import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import session from "express-session";
import pool from "./config/db.js";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import authMiddleware from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import repoRoutes from "./routes/repos.js";
import commitRoutes from "./routes/commits.js";
import prRoutes from "./routes/prs.js";
import summaryRoutes from "./routes/summaries.js";
import webhookRoutes from "./routes/webhooks.js";
import statsRoutes from "./routes/stats.js";

console.log('========================================');
console.log('DEV PULSE SERVER STARTING');
console.log('========================================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 5000);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('========================================');

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));

// Middleware to capture raw body for webhook signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }), (req, res, next) => {
    req.rawBody = req.body;
    req.body = JSON.parse(req.body.toString());
    next();
});

app.use(express.json());

app.use(session({
    secret: process.env.JWT_SECRET || 'devpulse_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use("/api/auth", authRoutes);
app.use("/api/repos", repoRoutes);
app.use("/api/commits", commitRoutes);
app.use("/api/prs", prRoutes);
app.use("/api/summaries", summaryRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/webhooks", webhookRoutes);

console.log('[APP] All routes registered:');
console.log('[APP] - /api/auth');
console.log('[APP] - /api/repos');
console.log('[APP] - /api/commits');
console.log('[APP] - /api/prs');
console.log('[APP] - /api/summaries');
console.log('[APP] - /api/stats');
console.log('[APP] - /api/webhooks');

app.get("/api/test", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1 + 1 AS result");

        res.json({
            message: "Database connected",
            data: rows,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database connection failed",
        });
    }
});

// Debug endpoint for summary generation
app.get("/api/debug-summary", async (req, res) => {
    console.log('\n');
    console.log('========================================');
    console.log('DEBUG ENDPOINT: /api/debug-summary');
    console.log('========================================');
    try {
        const { generateWeeklySummary } = await import('./services/aiService.js');

        // Get first repo for testing
        const [repos] = await pool.query('SELECT id FROM repositories LIMIT 1');

        if (repos.length === 0) {
            return res.json({
                error: 'No repositories found in database',
                message: 'Please track a repository first'
            });
        }

        const repoId = repos[0].id;
        console.log('[DEBUG] Using repo ID:', repoId);

        const summary = await generateWeeklySummary(repoId);

        res.json({
            message: 'Debug summary generated successfully',
            summary
        });
    } catch (error) {
        console.error('[DEBUG] Error:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug endpoint for testing Gemini directly
app.get("/api/test-gemini", async (req, res) => {
    console.log('\n');
    console.log('========================================');
    console.log('DEBUG ENDPOINT: /api/test-gemini');
    console.log('========================================');
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');

        console.log('[DEBUG] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        console.log('[DEBUG] Sending test prompt to Gemini...');
        const result = await model.generateContent('Say "Hello from Gemini!" in one sentence.');
        const response = await result.response;
        const text = response.text();

        console.log('[DEBUG] Gemini response:', text);

        res.json({
            message: 'Gemini test successful',
            response: text
        });
    } catch (error) {
        console.error('[DEBUG] Gemini test failed:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug endpoint for testing controller
app.get("/api/test-controller/:repoId", authMiddleware, async (req, res) => {
    console.log('\n');
    console.log('========================================');
    console.log('DEBUG ENDPOINT: /api/test-controller/:repoId');
    console.log('========================================');
    console.log('[DEBUG] User ID:', req.user.id);
    console.log('[DEBUG] Repo ID:', req.params.repoId);

    try {
        const { generateWeeklySummary } = await import('./services/aiService.js');
        const repoId = req.params.repoId;

        // Check if repo is tracked by user
        const [repos] = await pool.query(
            'SELECT id FROM repositories WHERE id = ? AND user_id = ?',
            [repoId, req.user.id]
        );

        if (repos.length === 0) {
            return res.status(404).json({
                error: 'Tracked repository not found',
            });
        }

        console.log('[DEBUG] Repository verified. Calling generateWeeklySummary...');
        const summary = await generateWeeklySummary(repoId);

        res.json({
            message: 'Controller test successful',
            summary
        });
    } catch (error) {
        console.error('[DEBUG] Controller test failed:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});
app.get("/api/protected", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query(
            "SELECT id, github_id, username, email, avatar_url FROM users WHERE id = ?",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            message: "Protected route accessed",
            user: rows[0],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});