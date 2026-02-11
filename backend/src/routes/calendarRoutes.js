import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js"; 
import Order from "../models/order.js";
import { createEventForOrder } from "../utils/googleCalendar.js";

const router = express.Router();

// admin-only
router.post("/orders/:id/calendar", authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const event = await createEventForOrder(order);
    if (!event) return res.status(200).json({ success: true, message: "No event created (missing date or config)", event: null });

    return res.status(200).json({ success: true, message: "Event created", event });
  } catch (err) {
    console.error("calendarRoutes POST /orders/:id/calendar error:", err);
    return res.status(500).json({ success: false, message: "Failed to create calendar event", error: err?.message || err });
  }
});

export default router;
