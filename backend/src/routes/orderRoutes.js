import express from "express";
import Order from "../models/order.js";
import { markOrderDelivered } from "../controllers/orderController.js"; // ✅ ADD THIS

const router = express.Router();

/* ---------------------------------------------
  CUSTOMER REQUEST PURCHASE
---------------------------------------------- */
router.post("/request-purchase", async (req, res) => {
  console.log("🔥 Incoming Request Body:", JSON.stringify(req.body, null, 2));

  try {
    const { userId, cartItems, totalAmount, addressInfo, deliveryDate } = req.body;

    console.log("Incoming order data:", req.body);

    if ((!userId && !req.body.customerId) || !cartItems || !cartItems.length || !totalAmount || !addressInfo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

   const formattedItems = cartItems.map((item) => ({
  productId: item.productId,        // REQUIRED
  productName: item.productName || "Unknown Product",
  quantity: item.quantity,
  price: item.price,
  deliveredQty: 0                   // recommended
}));


    const formattedAddress = `
${addressInfo.address}, 
${addressInfo.city}, 
${addressInfo.pincode}
Phone: ${addressInfo.phone}
Notes: ${addressInfo.notes || "None"}
`.trim();

    const customerId = req.body.customerId || userId;

    const newOrder = await Order.create({
      customerId,
      items: formattedItems,
      totalAmount,
      deliveryAddress: formattedAddress,
      status: "pending",
      paymentStatus: "unpaid",
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null
    });

    return res.status(201).json({
      success: true,
      message: "Purchase request successfully submitted",
      order: newOrder
    });

  } catch (err) {
    console.error("Request purchase error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Failed to submit purchase request."
    });
  }
});

/* ---------------------------------------------
  ADMIN: GET ALL PENDING ORDERS
---------------------------------------------- */
router.get("/pending", async (req, res) => {
  try {
    const orders = await Order.find({ status: "pending" }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      orders
    });
  } catch (err) {
    console.error("Pending orders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------
  ADMIN: APPROVE ORDER
---------------------------------------------- */
router.put("/admin/orders/approve", async (req, res) => {
  try {
    const { orderId, driverId } = req.body;

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    order.status = "accepted";
    order.driverId = driverId;
    order.assignedAt = new Date();

    await order.save();

    res.json({ success: true, message: "Order approved and assigned to driver", order });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------
  ADMIN: CANCEL ORDER
---------------------------------------------- */
router.put("/cancel/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    order.status = "cancelled";
    await order.save();

    res.json({ success: true, message: "Order cancelled" });
  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------
  USER: GET ALL ORDERS BY USER
---------------------------------------------- */
router.get("/user/:id", async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    console.error("User orders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------
  USER: GET ORDER DETAILS
---------------------------------------------- */
router.get("/details/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    console.error("Order details error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------
  ADMIN: GET ALL ORDERS
---------------------------------------------- */
router.get("/admin/orders/get", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customerId", "firstname lastname")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Admin get orders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------
  ADMIN: GET ORDER DETAILS
---------------------------------------------- */
router.get("/admin/orders/details/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "firstname lastname");

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, order });
  } catch (err) {
    console.error("Admin details error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------
  ADMIN: UPDATE ORDER STATUS
---------------------------------------------- */
router.put("/admin/orders/update/:id", async (req, res) => {
  try {
    const { orderStatus } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status: orderStatus },
      { new: true }
    );

    if (!updatedOrder)
      return res.status(404).json({ success: false, message: "Order not found" });

    res.json({
      success: true,
      message: "Order status updated",
      order: updatedOrder
    });
  } catch (err) {
    console.error("Admin update status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ---------------------------------------------
  DRIVER: GET ASSIGNED ORDERS
---------------------------------------------- */
router.get("/driver/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;

    const orders = await Order.find({
      driverId,
      status: { $in: ["accepted", "delivering"] },
    })
      .populate("customerId", "fullName email")
      .sort({ deliveryDate: 1 });

    res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error("Driver orders fetch error:", err);
    res.status(500).json({ success: false, message: "Server error fetching driver orders" });
  }
});

/* ---------------------------------------------
  ✅ DRIVER or ADMIN — MARK ORDER AS DELIVERED
---------------------------------------------- */
router.put("/:orderId/deliver", markOrderDelivered); // <-- ONLY ADDITION

export default router;
