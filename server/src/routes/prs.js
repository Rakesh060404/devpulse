import express from "express";
import authMiddleware from "../middleware/auth.js";
import { syncRepoPRs, getRepoPRs, getRepoPRAnalytics, getRepoPRStats, getWeeklyPRStats } from "../controllers/prController.js";

const router = express.Router();

router.post("/sync/:repoId", authMiddleware, syncRepoPRs);
router.get("/:repoId", authMiddleware, getRepoPRs);
router.get("/analytics/:repoId", authMiddleware, getRepoPRAnalytics);
router.get("/stats/:repoId", authMiddleware, getRepoPRStats);
router.get("/:repoId/weekly-stats", authMiddleware, getWeeklyPRStats);

export default router;