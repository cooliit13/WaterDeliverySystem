import express from "express";
import Order from "../models/order.js";
import {
  markOrderDelivered,
  requestPurchase,
  getDriverOrders,
  getBookedDeliveryDates,
  updateOrderStatus,
  approveAndAssignDriver,
  cancelOrder,
} from "../controllers/orderController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/request-purchase", requestPurchase);
router.get("/pending", async (req, res) => {
  try {
    const orders = await Order.find({ status: "pending" }).sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  } catch (err) {
    console.error("Pending orders error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/admin/orders/approve", async (req, res) => {
  try {
    const { orderId, driverId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.status = "accepted";
    order.driverId = driverId;
    order.assignedAt = new Date();

    await order.save();
    return res.json({ success: true, message: "Order approved and assigned to driver", order });
  } catch (err) {
    console.error("Approve error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


router.put("/cancel/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.status = "cancelled";
    await order.save();

    return res.json({ success: true, message: "Order cancelled" });
  } catch (err) {
    console.error("Cancel error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/user/:id", async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.id })
      .sort({ createdAt: -1 })
      .populate({ path: "items.productId", select: "name" });

    return res.json({ success: true, data: orders });
  } catch (err) {
    console.error("User orders error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/details/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate({ path: "items.productId", select: "name price image" });

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    return res.json({ success: true, data: order });
  } catch (err) {
    console.error("Order details error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/:id/cancel", authMiddleware, cancelOrder); //cancel order


router.get("/admin/orders/get", async (req, res) => {
  try {
    const orders = await Order.find().populate("customerId", "firstname lastname").sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  } catch (err) {
    console.error("Admin get orders error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/admin/orders/details/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("customerId", "firstname lastname");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    return res.json({ success: true, order });
  } catch (err) {
    console.error("Admin details error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


router.put("/admin/orders/update/:id", async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status: orderStatus }, { new: true });
    if (!updatedOrder) return res.status(404).json({ success: false, message: "Order not found" });
    return res.json({ success: true, message: "Order status updated", order: updatedOrder });
  } catch (err) {
    console.error("Admin update status error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/driver/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const orders = await Order.find({ driverId, status: { $in: ["accepted", "delivering"] } })
      .populate("customerId", "fullName email phoneNumber profileImage")
      .sort({ deliveryDate: 1 });
    return res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error("Driver orders fetch error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching driver orders" });
  }
});


router.post("/:orderId/feedback", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productRating, productFeedback, driverRating, driverFeedback } = req.body;

    // debug log
    console.log(`[feedback] orderId=${orderId} payload=`, JSON.stringify(req.body));

    const userId = req.user?.id ?? req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (String(order.customerId) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Forbidden — you can only rate your own orders" });
    }

    if (order.status !== "completed") {
      return res.status(400).json({ success: false, message: "Feedback allowed only for completed orders" });
    }

    if (order.feedbackSubmitted) {
      return res.status(400).json({ success: false, message: "Feedback already submitted for this order" });
    }

    if (typeof productRating !== "undefined" && productRating !== null) {
      const pr = Number(productRating);
      if (!Number.isNaN(pr)) order.productRating = pr;
    }
    if (typeof productFeedback === "string" && productFeedback.trim() !== "") {
      order.productFeedback = productFeedback.trim();
    }

    if (typeof driverRating !== "undefined" && driverRating !== null) {
      const dr = Number(driverRating);
      if (!Number.isNaN(dr)) order.driverRating = dr;
    }
    if (typeof driverFeedback === "string" && driverFeedback.trim() !== "") {
      order.driverFeedback = driverFeedback.trim();
    }

    order.feedbackSubmitted = true;
    await order.save();

    console.log("[feedback] saved order:", order._id, "productRating=", order.productRating, "driverRating=", order.driverRating);

    return res.json({ success: true, message: "Feedback saved", order });
  } catch (err) {
    console.error("Submit feedback error:", err);
    return res.status(500).json({ success: false, message: "Server error saving feedback" });
  }
});


router.get("/admin/feedbacks", async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { productFeedback: { $exists: true, $ne: "" } },
        { productRating: { $exists: true, $ne: null } },
        { driverFeedback: { $exists: true, $ne: "" } },
        { driverRating: { $exists: true, $ne: null } },
      ],
    })
      .populate("customerId", "firstname lastname email")
      .populate({ path: "items.productId", select: "name image" })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, feedbackOrders: orders });
  } catch (err) {
    console.error("Admin fetch feedbacks error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching feedbacks" });
  }
});


router.get("/admin/ratings/products", async (req, res) => {
  try {
    const pipeline = [
      { $match: { productRating: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: "$productRating" }, ratingCount: { $sum: 1 }, sampleFeedbacks: { $push: "$productFeedback" } } },
      { $project: { _id: 0, avgRating: { $round: ["$avgRating", 2] }, ratingCount: 1, sampleFeedbacks: { $slice: ["$sampleFeedbacks", 10] } } }
    ];
    const results = await Order.aggregate(pipeline).allowDiskUse(true);
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("Admin product ratings error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching product ratings" });
  }
});

router.get("/admin/ratings/drivers", async (req, res) => {
  try {
    const pipeline = [
      { $match: { driverRating: { $exists: true, $ne: null } } },
      { $group: { _id: "$driverId", avgRating: { $avg: "$driverRating" }, ratingCount: { $sum: 1 }, sampleDriverFeedbacks: { $push: "$driverFeedback" } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "driver" } },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
      { $project: {
          driverId: "$_id",
          driverName: { $trim: { input: { $concat: [{ $ifNull: ["$driver.firstname", ""]}, " ", { $ifNull: ["$driver.lastname", ""] }] } } },
          driverAltName: { $ifNull: ["$driver.fullName", { $ifNull: ["$driver.name", "$driver.email"] }] },
          avgRating: { $round: ["$avgRating", 2] },
          ratingCount: 1,
          sampleDriverFeedbacks: { $slice: ["$sampleDriverFeedbacks", 5] }
        }
      },
      { $project: {
          driverId: 1,
          driverName: { $cond: [ { $and: [{ $ne: ["$driverName", ""] }, { $ne: ["$driverName", null] }] }, "$driverName", { $ifNull: ["$driverAltName", "Unknown Driver"] } ] },
          avgRating: 1,
          ratingCount: 1,
          sampleDriverFeedbacks: 1
        }
      },
      { $sort: { avgRating: -1, ratingCount: -1 } },
    ];
    const results = await Order.aggregate(pipeline).allowDiskUse(true);
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("Admin driver ratings error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching driver ratings" });
  }
});


router.put("/:orderId/deliver", markOrderDelivered);

export default router;
