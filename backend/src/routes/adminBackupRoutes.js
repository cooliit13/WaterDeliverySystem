import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createBackupExport } from "../controllers/adminBackupController.js";

const router = express.Router();

// GET /api/admin/backup/export -> returns JSON file download
router.get("/export", authMiddleware, createBackupExport);

export default router;
