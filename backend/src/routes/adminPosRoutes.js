import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as PosController from "../controllers/PosController.js";

const router = express.Router();

// Record POS sale (admin only)
router.post("/sale", authMiddleware, PosController.createSale);

// (Optional) list sales - admin only
router.get("/list", authMiddleware, PosController.listSales);

export default router;
