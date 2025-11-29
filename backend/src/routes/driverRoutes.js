import express from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware.js";

import {
  registerDriver,
  loginDriver,
  getDriverProfile,
  updateDriverProfile,
  getAssignedOrders,
  updateDeliveryStatus,
  uploadProofOfDelivery
} from "../controllers/driverController.js";

const router = express.Router();

/* ---------------------------------------------
   CLOUDINARY upload uses memoryStorage
---------------------------------------------- */
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

export default router;
