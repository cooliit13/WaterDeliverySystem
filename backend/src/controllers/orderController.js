import mongoose from "mongoose";
import Order from "../models/order.js";
import Product from "../models/Product.js";
import { createEventForOrder } from "../utils/googleCalendar.js";
import { geocodeAddress } from "../utils/geocode.js";

/* ---------------------------------------------
  Helper: processDelivery(orderId, itemsArrayOrNull)
  - updates Product.stock (decrement) and items.$.deliveredQty on the order
  - sets order.status = "completed" when all delivered and marks paymentStatus = "paid"
  - returns an object with summary for debugging
----------------------------------------------*/
export const processDelivery = async (orderId, itemsArray = null) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order id");
  }

  let session = null;
  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    const itemsToProcess = [];

    if (Array.isArray(itemsArray) && itemsArray.length > 0) {
      for (const it of itemsArray) {
        const pid = it?.productId ? String(it.productId) : null;
        const qty = Math.max(0, Number(it.qtyDelivered ?? it.qty ?? it.quantity ?? 0));
        if (pid && mongoose.Types.ObjectId.isValid(pid) && qty > 0) {
          itemsToProcess.push({ productId: pid, qtyRequested: qty });
        }
      }
    } else {
      for (const it of order.items) {
        const orderedQty = Number(it.quantity ?? it.qty ?? 0);
        const prevDelivered = Number(it.deliveredQty ?? 0);
        const remaining = Math.max(0, orderedQty - prevDelivered);
        if (remaining > 0 && it.productId) {
          itemsToProcess.push({ productId: String(it.productId), qtyRequested: remaining });
        }
      }
    }

    if (itemsToProcess.length === 0) {
      throw new Error("No deliverable items provided or remaining");
    }

    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (txErr) {
      session = null;
    }

    const productUpdates = [];

    for (const it of itemsToProcess) {
      const pid = it.productId;
      const qtyReq = Number(it.qtyRequested || 0);
      if (!pid || qtyReq <= 0) continue;

      const orderItem = order.items.find((oi) => oi.productId?.toString() === pid);
      if (!orderItem) {
        if (session) { await session.abortTransaction(); session.endSession(); }
        throw new Error(`Product ${pid} not found in order`);
      }

      const prevDelivered = Number(orderItem.deliveredQty ?? 0);
      const orderedQty = Number(orderItem.quantity ?? orderItem.qty ?? 0);
      const remaining = Math.max(0, orderedQty - prevDelivered);
      const deliverable = Math.max(0, Math.min(remaining, qtyReq));
      if (deliverable <= 0) continue;

      // decrement product stock
      const updatedProduct = await Product.findByIdAndUpdate(
        pid,
        { $inc: { stock: -deliverable } },
        { new: true, session }
      );

      if (!updatedProduct) {
        if (session) { await session.abortTransaction(); session.endSession(); }
        throw new Error(`Product ${pid} not found`);
      }

      productUpdates.push({ productId: pid, delta: -deliverable, newStock: updatedProduct.stock });

      if (typeof updatedProduct.stock === "number" && updatedProduct.stock < 0) {
        // revert and abort
        await Product.findByIdAndUpdate(pid, { $inc: { stock: deliverable } }, { session });
        if (session) { await session.abortTransaction(); session.endSession(); }
        throw new Error(`Insufficient stock for product ${pid}`);
      }

      // increment deliveredQty on order items
      const upd = await Order.updateOne(
        { _id: orderId, "items.productId": pid },
        { $inc: { "items.$.deliveredQty": deliverable }, $set: { updatedAt: new Date() } },
        { session }
      );

      if (!upd || (upd.matchedCount === 0 && upd.nModified === 0)) {
        // fallback: update in-memory and save
        const idx = order.items.findIndex((oi) => oi.productId?.toString() === pid);
        if (idx >= 0) {
          order.items[idx].deliveredQty = (Number(order.items[idx].deliveredQty ?? 0) + deliverable);
          order.updatedAt = new Date();
          await order.save({ session });
        } else {
          console.warn(`processDelivery: could not update deliveredQty for pid ${pid} (fallback)`);
        }
      }
    }

    // refresh and finalize
    const freshOrder = await Order.findById(orderId).session(session);
    const allDelivered = freshOrder.items.every((it) => (Number(it.deliveredQty ?? 0) >= Number(it.quantity ?? it.qty ?? 0)));

    if (allDelivered) {
      freshOrder.status = "completed";
      if (!freshOrder.paymentStatus || String(freshOrder.paymentStatus).toLowerCase() !== "paid") {
        freshOrder.paymentStatus = "paid";
      }
      await freshOrder.save({ session });
    } else {
      if (["pending", "accepted"].includes(freshOrder.status)) {
        freshOrder.status = "delivering";
        await freshOrder.save({ session });
      }
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return { success: true, message: "Delivery processed", productUpdates, orderId: String(orderId), allDelivered };
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); session.endSession(); } catch (e) {}
    }
    throw err;
  }
};

/* ---------------------------------------------
  requestPurchase: improved geocoding attempts (full then fallback)
----------------------------------------------*/
export const requestPurchase = async (req, res) => {
  console.log("🔥 Incoming Request Body:", JSON.stringify(req.body, null, 2));

  try {
    const { userId, cartItems, totalAmount, addressInfo, deliveryDate } = req.body;

    if ((!userId && !req.body.customerId) || !cartItems || !cartItems.length || !totalAmount || !addressInfo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const formattedItems = cartItems.map((item) => ({
      productId: item.productId || null,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      deliveredQty: 0,
    }));

    // build two address strings: full (detailed) and a shorter candidate
    const fullAddress = [
      addressInfo.address,
      addressInfo.city,
      addressInfo.pincode ? addressInfo.pincode : "",
      addressInfo.notes ? `Notes: ${addressInfo.notes}` : "",
    ].filter(Boolean).join(", ");

    const shortAddress = [addressInfo.address, addressInfo.city].filter(Boolean).join(", ");

    const customerId = req.body.customerId || userId;

    let deliveryLocation = null;
    try {
      // try full address first
      deliveryLocation = await geocodeAddress(fullAddress);
      if (!deliveryLocation) {
        // try shorter address (sometimes Nominatim/Geoapify needs different phrasing)
        deliveryLocation = await geocodeAddress(shortAddress);
      }
    } catch (gErr) {
      console.warn("Geocode attempts failed, continuing without coordinates:", gErr);
      deliveryLocation = null;
    }

    const formattedAddress = [
      addressInfo.address,
      addressInfo.city,
      addressInfo.pincode ? addressInfo.pincode : "",
      `Phone: ${addressInfo.phone || ""}`,
      `Notes: ${addressInfo.notes || "None"}`,
    ].filter(Boolean).join("\n");

    const newOrder = await Order.create({
      customerId,
      items: formattedItems,
      totalAmount,
      deliveryAddress: formattedAddress,
      deliveryLocation: deliveryLocation || null,
      status: "pending",
      paymentStatus: "unpaid",
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
    });

    return res.status(201).json({
      success: true,
      message: "Purchase request successfully submitted",
      order: newOrder,
    });
  } catch (err) {
    console.error("Request purchase error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Failed to submit purchase request.",
    });
  }
};

export const getDriverOrders = async (req, res) => {
  try {
    const driverId = req.params.driverId || (req.user && (req.user.id || req.user.userId));
    if (!driverId) {
      return res.status(400).json({ success: false, message: "Driver ID required" });
    }

    const orders = await Order.find({
      driverId,
      status: { $in: ["accepted", "delivering"] },
    })
      .populate("customerId", "fullName email phoneNumber profileImage")
      .sort({ deliveryDate: 1 });

    return res.status(200).json(orders);
  } catch (err) {
    console.error("Driver Orders Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch driver orders",
    });
  }
};

export const getBookedDeliveryDates = async (req, res) => {
  try {
    const orders = await Order.find(
      { status: { $in: ["pending", "accepted", "delivering"] } },
      "deliveryDate -_id"
    );

    const bookedDates = orders
      .map((o) => {
        if (o.deliveryDate) {
          return new Date(o.deliveryDate).toISOString().split("T")[0];
        }
        return null;
      })
      .filter(Boolean);

    return res.status(200).json({ bookedDates });
  } catch (err) {
    console.error("Error fetching booked delivery dates:", err);
    return res.status(500).json({ message: "Failed to fetch booked delivery dates" });
  }
};

// MarkOrderDelivered
// markOrderDelivered (idempotent wrapper)
export const markOrderDelivered = async (req, res) => {
  const { orderId } = req.params;
  const deliveredItems = Array.isArray(req.body?.items) ? req.body.items : null;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ success: false, message: "Invalid order id" });
  }

  try {
    // Build itemsArray to pass to processDelivery (if provided)
    let itemsArray = null;
    if (Array.isArray(deliveredItems) && deliveredItems.length > 0) {
      itemsArray = deliveredItems.map((it) => ({
        productId: it.productId ? String(it.productId) : null,
        productName: it.productName || null,
        qtyDelivered: Number(it.qtyDelivered ?? it.qty ?? it.quantity ?? 0),
      }));
    }

    try {
      const result = await processDelivery(orderId, itemsArray);
      // return updated order to client
      const freshOrder = await Order.findById(orderId).lean();
      return res.status(200).json({ success: true, message: "Delivery recorded", order: freshOrder, result });
    } catch (procErr) {
      const msg = String(procErr?.message || "").toLowerCase();

      // If processDelivery says "No deliverable items provided" -> idempotent success
      if (msg.includes("no deliverable") || msg.includes("no deliverable items")) {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        // ensure status/paymentStatus consistent if needed
        if (order.status !== "completed") {
          order.status = "completed";
        }
        if (!order.paymentStatus || String(order.paymentStatus).toLowerCase() !== "paid") {
          order.paymentStatus = "paid";
        }
        await order.save();

        const fresh = await Order.findById(orderId).lean();
        return res.status(200).json({
          success: true,
          message: "Order already fully delivered (idempotent)",
          order: fresh,
        });
      }

      console.error("markOrderDelivered -> processDelivery failed:", procErr);
      return res.status(500).json({ success: false, message: "Failed to record delivery", error: procErr.message || String(procErr) });
    }
  } catch (err) {
    console.error("markOrderDelivered error:", err);
    return res.status(500).json({ success: false, message: "Failed to record delivery", error: err.message || String(err) });
  }
};

/* ---------------------------------------------
  Cancel order (customer request)
  - ownership check (req.user if authMiddleware used)
  - do not allow cancelling if already accepted/delivering/shipped/completed
  - emits "order:cancelled" via global.io (if available)
----------------------------------------------*/
export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id || req.params.orderId;
    if (!orderId) return res.status(400).json({ success: false, message: "Missing order id" });
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // If auth middleware provides req.user, only allow owner to cancel
    const requesterId = req.user?.id ?? req.user?._id ?? null;
    if (requesterId && String(order.customerId) !== String(requesterId)) {
      return res.status(403).json({ success: false, message: "Forbidden — you can only cancel your own orders" });
    }

    const currentStatus = String(order.status || "").toLowerCase();
    const disallowed = ["confirm", "approved", "processing", "shipped", "out for delivery", "delivering", "completed"];
    if (disallowed.some((kw) => currentStatus.includes(kw))) {
      return res.status(400).json({ success: false, message: "Order cannot be cancelled at this stage" });
    }

    order.status = "cancelled";
    order.cancelledAt = new Date();
    if (requesterId) order.cancelledBy = requesterId;

    await order.save();

    // emit socket event for admin clients (use global.io set from server.js)
    try {
      if (global?.io && typeof global.io.emit === "function") {
        global.io.emit("order:cancelled", {
          orderId: String(order._id),
          status: order.status,
          cancelledAt: order.cancelledAt,
          customerId: order.customerId,
        });
      }
    } catch (emitErr) {
      console.warn("Failed to emit order:cancelled socket event:", emitErr);
    }

    return res.json({ success: true, message: "Order cancelled", order });
  } catch (err) {
    console.error("cancelOrder error:", err);
    return res.status(500).json({ success: false, message: "Server error cancelling order" });
  }
};

/* ---------------------------------------------
  updateOrderStatus: update status; if status === 'completed' then process delivery
----------------------------------------------*/
export const updateOrderStatus = async (req, res) => {
  const orderId = req.params.id || req.params.orderId;
  const { status } = req.body;

  if (!orderId || !status) {
    return res.status(400).json({ success: false, message: "order id and status required" });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (status === "completed") {
      try {
        const proc = await processDelivery(orderId, null); // deliver remaining
        return res.status(200).json({ success: true, message: "Order marked completed and delivery recorded", proc });
      } catch (procErr) {
        console.error("updateOrderStatus -> processDelivery failed:", procErr);
        return res.status(500).json({ success: false, message: procErr.message || "Failed to process delivery" });
      }
    }

    order.status = status;
    await order.save();
    return res.status(200).json({ success: true, message: "Status updated", order });
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    return res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

/* ---------------------------------------------
  approveAndAssignDriver
----------------------------------------------*/
export const approveAndAssignDriver = async (req, res) => {
  try {
    const { orderId, driverId } = req.body;
    if (!orderId || !driverId) {
      return res.status(400).json({ success: false, message: "orderId and driverId required" });
    }
    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({ success: false, message: "Invalid orderId or driverId" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.driverId = driverId;
    order.status = "accepted";
    order.updatedAt = new Date();

    await order.save();

    try {
      console.log(`approveAndAssignDriver: order ${order._id} accepted — attempting to create calendar event`);
      const event = await createEventForOrder(order);
      if (event) {
        console.log("approveAndAssignDriver: calendar event created:", { id: event.id, htmlLink: event.htmlLink });
      } else {
        console.log("approveAndAssignDriver: createEventForOrder returned null — no event created.");
      }
    } catch (calErr) {
      console.error("approveAndAssignDriver: createEventForOrder error:", calErr);
    }

    return res.status(200).json({ message: "Order approved and assigned to driver", order });
  } catch (err) {
    console.error("approveAndAssignDriver error:", err);
    return res.status(500).json({ success: false, message: "Failed to approve and assign driver", error: err.message || err });
  }
};

export default {
  requestPurchase,
  getDriverOrders,
  getBookedDeliveryDates,
  markOrderDelivered,
  updateOrderStatus,
  processDelivery,
  approveAndAssignDriver,
  cancelOrder, // <-- added
};
