// backend/src/routes/posRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { listPosSales, createPosSale } from "../controllers/PosController.js";

const router = express.Router();

// Admin-only list of POS sales
router.get("/list", authMiddleware, listPosSales);

// Admin-only create POS sale
router.post("/sale", authMiddleware, createPosSale);

export default router;
