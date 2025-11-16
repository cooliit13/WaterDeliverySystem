// backend/src/routes/deliveryRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { markOrderDelivered } from "../controllers/orderController.js";

const router = express.Router();

// PUT /api/driver/orders/:orderId/deliver
router.put("/orders/:orderId/deliver", authMiddleware, markOrderDelivered);

export default router;
