import express from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware.js";
import User from "../models/User.js"; // ✅ added

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

/* ✅ Multer setup */
const storage = multer.diskStorage({
  destination: "uploads/proofs",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ✅ PUBLIC ROUTES
router.post("/register", registerDriver);
router.post("/login", loginDriver);

// ✅ PROTECTED ROUTES
router.get("/profile", authMiddleware, getDriverProfile);
router.put("/profile", authMiddleware, updateDriverProfile);

router.get("/orders", authMiddleware, getAssignedOrders);

router.put(
  "/orders/:orderId/status",
  authMiddleware,
  updateDeliveryStatus
);

// ✅ UPLOAD PROOF OF DELIVERY
router.post(
  "/orders/:orderId/proof",
  authMiddleware,
  upload.single("proof"),
  uploadProofOfDelivery
);

/* ---------------------------------------------
  ✅ ADMIN: Get all drivers (used by admin dashboard)
  - minimal, protected route
----------------------------------------------*/
router.get("/admin/drivers", authMiddleware, async (req, res) => {
  try {
    // authMiddleware should set req.user; require admin role
    const requesterRole = req.user?.role;
    if (!requesterRole || requesterRole.toLowerCase() !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Fetch users with role 'driver'
    const drivers = await User.find({ role: "driver" }).select(
      "_id name fullName email"
    );

    // Return array (frontend expects an array)
    return res.status(200).json(drivers);
  } catch (err) {
    console.error("Failed to fetch drivers:", err);
    return res.status(500).json({ success: false, message: "Server error fetching drivers" });
  }
});

export default router;
