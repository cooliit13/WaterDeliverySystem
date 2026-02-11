import express from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware.js";

// driver handlers
import {
  registerDriver,
  loginDriver,
  getDriverProfile,
  updateDriverProfile,
  getAssignedOrders,
  updateDeliveryStatus,
  uploadProofOfDelivery,
  getAllDriversAdmin,
} from "../controllers/driverController.js";

import { markOrderDelivered } from "../controllers/orderController.js";

const router = express.Router();


const storage = multer.memoryStorage();
const upload = multer({ storage });

/* PUBLIC */
router.post("/register", registerDriver);
router.post("/login", loginDriver);

/* PROTECTED */
router.get("/profile", authMiddleware, getDriverProfile);
router.put("/profile", authMiddleware, updateDriverProfile);

router.get("/orders", authMiddleware, getAssignedOrders);

/* DRIVER updates status */
router.put("/orders/:orderId/status", authMiddleware, updateDeliveryStatus);

/* DRIVER uploads proof → Cloudinary */
router.post(
  "/orders/:orderId/proof",
  authMiddleware,
  upload.single("proof"),
  uploadProofOfDelivery
);

/* DRIVER marks as delivered (uploads handled separately by /proof flow) */
router.put("/orders/:orderId/deliver", authMiddleware, markOrderDelivered);

/* ADMIN: list drivers (no RBAC check; authMiddleware still applied) */
router.get("/admin/drivers", authMiddleware, getAllDriversAdmin);

export default router;
