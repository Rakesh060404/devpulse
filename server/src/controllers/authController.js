import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const githubCallback = async (req, res) => {
    try {
        const profile = req.user.profile;
        const accessToken = req.user.accessToken;

        const githubId = profile.id;
        const username = profile.username;
        const email = profile.emails?.[0]?.value || null;
        const avatarUrl = profile.photos?.[0]?.value || null;

        // check existing user
        const [existingUsers] = await pool.query(
            "SELECT * FROM users WHERE github_id = ?",
            [githubId]
        );

        let userId;

        if (existingUsers.length === 0) {
            const [result] = await pool.query(
                `INSERT INTO users 
        (github_id, username, email, avatar_url, access_token)
        VALUES (?, ?, ?, ?, ?)`,
                [githubId, username, email, avatarUrl, accessToken]
            );

            userId = result.insertId;
        } else {
            userId = existingUsers[0].id;

            await pool.query(
                `UPDATE users
                SET access_token = ?, username = ?, email = ?, avatar_url = ?
                WHERE id = ?`,
                [accessToken, username, email, avatarUrl, userId]
            );
        }

        // generate JWT
        const token = jwt.sign(
            {
                id: userId,
                github_id: githubId,
                username,
                email,
                avatarUrl,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        // Redirect to frontend with token
        res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/dashboard?token=${token}`);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Authentication failed",
        });
    }
};