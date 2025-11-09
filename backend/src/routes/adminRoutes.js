import express from "express";
import {
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getAllCustomers,
  getAllDrivers,
  approveOrder
} from "../controllers/adminController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Order from "../models/order.js";

const router = express.Router();

// Admin check
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

// User management
router.get("/users", authMiddleware, adminOnly, getAllUsers);
router.put("/users/:id/status", authMiddleware, adminOnly, updateUserStatus);
router.delete("/users/:id", authMiddleware, adminOnly, deleteUser);

router.get("/customers", authMiddleware, adminOnly, getAllCustomers);
router.get("/drivers", authMiddleware, adminOnly, getAllDrivers);
router.put("/orders/approve", authMiddleware, approveOrder);


// ==========================================
// ✅ FIXED ORDER ROUTES (NECESSARY CHANGES ONLY)
// ==========================================

// ✅ Get all orders
// ✅ Get all orders
router.get("/orders/get", authMiddleware, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customerId", "fullName email")   // ✅ FIXED HERE
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Admin get orders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Get order details
router.get("/orders/details/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "fullName email");   // ✅ FIXED HERE

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error("Admin order details error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ✅ Update order status
router.put("/orders/update/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { orderStatus } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status: orderStatus },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({
      success: true,
      message: "Order status updated",
      order: updatedOrder
    });
  } catch (err) {
    console.error("Admin update order status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
