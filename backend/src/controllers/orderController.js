import Order from "../models/order.js";

export const requestPurchase = async (req, res) => {
  try {
    console.log("🔥 Incoming Request Body:", req.body);

    const {
      userId,
      cartItems,
      totalAmount,
      addressInfo
    } = req.body;

    // ✅ Validate required fields
    if (!userId || !cartItems || !cartItems.length || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const newOrder = await Order.create({
      customerId: userId,
      items: cartItems.map((item) => ({
        productName: item.productName || "Unknown Product",
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount,
      status: "pending",
      paymentStatus: "unpaid",
      deliveryAddress: addressInfo?.address || "No address provided",
      deliveryDate: null
    });

    res.status(201).json({
      success: true,
      message: "Purchase request successfully submitted",
      order: newOrder
    });

  } catch (err) {
    console.error("Request purchase error:", err);
    res.status(500).json({
      success: false,
      message: "Server error. Failed to submit purchase request."
    });
  }
};


// ✅ Get all pending orders (ADMIN)
export const getPendingOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: "pending" });
    res.json({ success: true, orders });
  } catch (err) {
    console.error("Pending order error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Accept order (ADMIN)
export const acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    order.status = "accepted";
    await order.save();

    res.json({ success: true, message: "Order accepted" });
  } catch (err) {
    console.error("Accept order error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Cancel order (ADMIN)
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    order.status = "cancelled";
    await order.save();

    res.json({ success: true, message: "Order cancelled" });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
