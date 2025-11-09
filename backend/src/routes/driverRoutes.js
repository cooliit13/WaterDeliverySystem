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

export default router;
