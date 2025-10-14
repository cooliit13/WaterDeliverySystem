import express from "express";
import {
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getAllCustomers,
  getAllDrivers,
  getAllOrders,
} from "../controllers/adminController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Middleware to check admin role
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

// Admin routes
router.get("/users", authMiddleware, adminOnly, getAllUsers);
router.put("/users/:id/status", authMiddleware, adminOnly, updateUserStatus);
router.delete("/users/:id", authMiddleware, adminOnly, deleteUser);

router.get("/customers", authMiddleware, adminOnly, getAllCustomers);
router.get("/drivers", authMiddleware, adminOnly, getAllDrivers);
router.get("/orders", authMiddleware, adminOnly, getAllOrders);

export default router;
