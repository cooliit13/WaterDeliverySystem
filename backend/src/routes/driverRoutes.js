import express from "express";
import {
  registerDriver,
  loginDriver,
  getDriverProfile,
  updateDriverProfile,
  getAssignedOrders,
  updateDeliveryStatus,
} from "../controllers/driverController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.post("/register", registerDriver);
router.post("/login", loginDriver);

// Protected
router.get("/profile", authMiddleware, getDriverProfile);
router.put("/profile", authMiddleware, updateDriverProfile);
router.get("/orders", authMiddleware, getAssignedOrders);
router.put("/orders/status", authMiddleware, updateDeliveryStatus);

export default router;
