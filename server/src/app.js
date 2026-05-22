import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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

dotenv.config();

const app = express();

app.use(cors({
    origin: true, // Allow all origins in dev, or specify origins
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
        secure: false, // set to true if using https
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