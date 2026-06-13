import express from "express";
import passport from "../config/passport.js";
import { githubCallback } from "../controllers/authController.js";

const router = express.Router();

router.get(
    "/github",
    passport.authenticate("github", {
        scope: ["user:email"],
    })
);

router.get(
    "/github/callback",
    (req, res, next) => {
        passport.authenticate(
            "github",
            { session: false },
            (err, user, info) => {
                if (err) {
                    console.error("Passport OAuth error:", err);
                    return res.status(500).json({
                        error: "Failed to obtain access token",
                        details: err.message || err,
                    });
                }

                if (!user) {
                    return res.redirect(
                        `${process.env.CLIENT_URL || "http://localhost:3000"}/login`
                    );
                }

                req.user = user;
                return githubCallback(req, res);
            }
        )(req, res, next);
    }
);

export default router;