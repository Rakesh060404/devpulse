import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import authMiddleware from "./middleware/auth.js";
import repoRoutes from "./routes/repos.js";
import commitRoutes from "./routes/commits.js";
import prRoutes from "./routes/prs.js";
import summaryRoutes from "./routes/summaries.js";
import webhookRoutes from "./routes/webhooks.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(passport.initialize());
app.use("/api/auth", authRoutes);
app.use("/api/repos", repoRoutes);
app.use("/api/commits", commitRoutes);
app.use("/api/prs", prRoutes);
app.use("/api/summaries", summaryRoutes);
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});