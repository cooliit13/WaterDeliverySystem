import express from "express";
import {
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getAllCustomers,
  getAllDrivers,
  updateUserRole,
} from "../controllers/adminController.js";
import { createDriverAccount } from "../controllers/driverController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Order from "../models/order.js";

// new import -> approveAndAssignDriver
import { approveAndAssignDriver } from "../controllers/orderController.js";

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


router.put("/users/:id/role", authMiddleware, adminOnly, updateUserRole);
router.patch("/users/:id/role", authMiddleware, adminOnly, updateUserRole);
// ------------------------------------------------------------------

router.get("/customers", authMiddleware, adminOnly, getAllCustomers);
router.get("/drivers", authMiddleware, adminOnly, getAllDrivers);
router.post("/drivers", authMiddleware, adminOnly, createDriverAccount);

// <-- use new approveAndAssignDriver here (keeps same route used by frontend)
router.put("/orders/approve", authMiddleware, adminOnly, approveAndAssignDriver);

router.get("/orders/get", authMiddleware, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customerId", "fullName email")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Admin get orders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//  Get order details
router.get("/orders/details/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "fullName email");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error("Admin order details error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//  Update order status
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
