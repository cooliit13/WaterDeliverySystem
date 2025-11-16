// backend/src/controllers/orderController.js
import mongoose from "mongoose";
import Order from "../models/order.js";
import Product from "../models/Product.js";
import { createEventForOrder } from "../utils/googleCalendar.js";
import { geocodeAddress } from "../utils/geocode.js";

/* ---------------------------------------------
  Helper: processDelivery(orderId, itemsArrayOrNull)
  - itemsArray: optional array of { productId, qtyDelivered } to deliver specific amounts
  - if itemsArray is null -> deliver remaining qty for each item
  - updates Product.stock (decrement) and items.$.deliveredQty on the order
  - sets order.status = "completed" when all delivered
----------------------------------------------*/
export const processDelivery = async (orderId, itemsArray = null) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Invalid order id");
  }

  let session = null;
  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    // Build itemsToProcess: array of { productId, qtyRequested }
    const itemsToProcess = [];

    if (Array.isArray(itemsArray) && itemsArray.length > 0) {
      for (const it of itemsArray) {
        if (!it?.productId || !mongoose.Types.ObjectId.isValid(it.productId)) continue;
        const qty = Number(it.qtyDelivered ?? it.qty ?? 0);
        if (qty > 0) itemsToProcess.push({ productId: it.productId.toString(), qtyRequested: qty });
      }
    } else {
      // Deliver remaining qty for each order item
      for (const it of order.items) {
        const orderedQty = Number(it.quantity ?? it.qty ?? 0);
        const prevDelivered = Number(it.deliveredQty ?? 0);
        const remaining = Math.max(0, orderedQty - prevDelivered);
        if (remaining > 0 && it.productId) {
          itemsToProcess.push({ productId: it.productId.toString(), qtyRequested: remaining });
        }
      }
    }

    if (itemsToProcess.length === 0) {
      throw new Error("No deliverable items provided or remaining");
    }

    // Try start a transaction/session (works if replica set)
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (txErr) {
      session = null;
    }

    for (const it of itemsToProcess) {
      const pid = it.productId;
      const qtyReq = Number(it.qtyRequested || 0);
      if (!pid || qtyReq <= 0) continue;

      // Find order item
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

      // Decrement product stock
      const updatedProduct = await Product.findByIdAndUpdate(
        pid,
        { $inc: { stock: -deliverable } },
        { new: true, session }
      );

      if (!updatedProduct) {
        if (session) { await session.abortTransaction(); session.endSession(); }
        throw new Error(`Product ${pid} not found`);
      }

      if (typeof updatedProduct.stock === "number" && updatedProduct.stock < 0) {
        // revert and abort
        await Product.findByIdAndUpdate(pid, { $inc: { stock: deliverable } }, { session });
        if (session) { await session.abortTransaction(); session.endSession(); }
        throw new Error(`Insufficient stock for product ${pid}`);
      }

      // Increment order item's deliveredQty
      await Order.updateOne(
        { _id: orderId, "items.productId": pid },
        { $inc: { "items.$.deliveredQty": deliverable }, $set: { updatedAt: new Date() } },
        { session }
      );
    }

    // Refresh order and check completion
    const freshOrder = await Order.findById(orderId).session(session);
    const allDelivered = freshOrder.items.every((it) => (it.deliveredQty ?? 0) >= (it.quantity ?? it.qty ?? 0));

    if (allDelivered) {
      freshOrder.status = "completed";
      await freshOrder.save({ session });
    } else {
      // if some delivered, ensure status moved at least to delivering
      if (["pending", "accepted"].includes(freshOrder.status)) {
        freshOrder.status = "delivering";
        await freshOrder.save({ session });
      }
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return { success: true, message: "Delivery processed" };
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); session.endSession(); } catch (e) { /* ignore */ }
    }
    throw err;
  }
};

/* ---------------------------------------------
  Existing controllers (requestPurchase, getDriverOrders, getBookedDeliveryDates)
  updated minimally to ensure items include productId and deliveredQty initialization
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

    const formattedAddress = `
${addressInfo.address}, 
${addressInfo.city}, 
${addressInfo.pincode}
Phone: ${addressInfo.phone}
Notes: ${addressInfo.notes || "None"}
`.trim();

    const customerId = req.body.customerId || userId;

    let deliveryLocation = null;
    try {
      deliveryLocation = await geocodeAddress(formattedAddress);
    } catch (gErr) {
      deliveryLocation = null;
    }

    const newOrder = await Order.create({
      customerId,
      items: formattedItems,
      totalAmount,
      deliveryAddress: formattedAddress,
      deliveryLocation,
      status: "pending",
      paymentStatus: "unpaid",
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
    });

    // If you want events only when admin approves, keep this commented-out.
    // (We intentionally do NOT create calendar events here; admin approval will create them.)
    //
    // if (deliveryDate) {
    //   try {
    //     await createEventForOrder(newOrder);
    //   } catch (calErr) {
    //     console.error("Google Calendar createEventForOrder error:", calErr);
    //   }
    // }

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

//MarkOrderDelivered
export const markOrderDelivered = async (req, res) => {
  const { orderId } = req.params;
  const deliveredItems = Array.isArray(req.body?.items) ? req.body.items : null;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ success: false, message: "Invalid order id" });
  }

  let session = null;
  try {
    // Load order (not lean because we may later update)
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Build itemsToProcess: array of { productId, qtyRequested, orderItemIndex }
    const itemsToProcess = [];

    if (deliveredItems && deliveredItems.length > 0) {
      // If frontend supplied explicit delivered items (best)
      for (const it of deliveredItems) {
        if (!it?.productId || !mongoose.Types.ObjectId.isValid(it.productId)) continue;
        const qty = Number(it.qtyDelivered ?? it.qty ?? it.quantity ?? 0);
        if (qty > 0) itemsToProcess.push({ productId: it.productId.toString(), qtyRequested: qty });
      }
    } else {
      // No explicit delivered items supplied: compute remaining per order item
      for (const it of order.items) {
        const orderedQty = Number(it.quantity ?? it.qty ?? 0);
        const prevDelivered = Number(it.deliveredQty ?? 0);
        const remaining = Math.max(0, orderedQty - prevDelivered);
        if (remaining <= 0) continue;

        // If productId exists, use it
        if (it.productId && mongoose.Types.ObjectId.isValid(it.productId)) {
          itemsToProcess.push({ productId: it.productId.toString(), qtyRequested: remaining });
        } else {
          // TRY to resolve by product name (best-effort for old orders)
          if (it.productName) {
            const product = await Product.findOne({
              $or: [{ name: it.productName }, { title: it.productName }, { productName: it.productName }],
            }).lean();

            if (product && product._id) {
              itemsToProcess.push({ productId: product._id.toString(), qtyRequested: remaining });
            } else {
              // If cannot resolve, skip this item but log
              console.warn(`markOrderDelivered: cannot resolve product for order ${orderId} item name="${it.productName}"`);
            }
          } else {
            console.warn(`markOrderDelivered: order ${orderId} has item without productId or productName, skipping`);
          }
        }
      }
    }

    if (itemsToProcess.length === 0) {
      // nothing to do
      return res.status(400).json({ success: false, message: "No deliverable items provided or remaining" });
    }

    // Try to start a session/transaction (works if replica set enabled)
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (txErr) {
      session = null; // proceed without transaction if not supported
    }

    // Process each item
    for (const it of itemsToProcess) {
      const pid = it.productId;
      const qtyReq = Number(it.qtyRequested || 0);
      if (!pid || qtyReq <= 0) continue;

      // Find order item to compute remaining (match by productId OR productName fallback)
      const orderItem = order.items.find((oi) => {
        if (oi.productId && oi.productId.toString() === pid) return true;
        if (!oi.productId && oi.productName) {
          // If item had no productId but name matched a resolved product, match by name
          // (we matched it earlier via Product.findOne). Use string compare.
          return false; // skip here (we already mapped to product) - will update by productId query
        }
        return false;
      });

      // If orderItem not found by productId in order.items (because original item had no productId),
      // we will still update product stock and then increment deliveredQty for the item using positional operator by matching productId (best-effort)
      const prevDelivered = Number(orderItem?.deliveredQty ?? 0);
      const orderedQty = Number(orderItem?.quantity ?? orderItem?.qty ?? 0);
      const remaining = Math.max(0, (orderedQty || 0) - (prevDelivered || 0));
      const deliverable = Math.max(0, Math.min(remaining || qtyReq, qtyReq));
      if (deliverable <= 0) continue;

      // 1) decrement product stock atomically
      const updatedProduct = await Product.findByIdAndUpdate(
        pid,
        { $inc: { stock: -deliverable } },
        { new: true, session }
      );

      if (!updatedProduct) {
        if (session) { await session.abortTransaction(); session.endSession(); }
        return res.status(404).json({ success: false, message: `Product ${pid} not found` });
      }

      if (typeof updatedProduct.stock === "number" && updatedProduct.stock < 0) {
        // revert decrement and abort
        await Product.findByIdAndUpdate(pid, { $inc: { stock: deliverable } }, { session });
        if (session) { await session.abortTransaction(); session.endSession(); }
        return res.status(400).json({ success: false, message: `Insufficient stock for product ${pid}` });
      }

      // 2) increment order item's deliveredQty
      // Try positional update (items.$) for item with productId
      const updateRes = await Order.updateOne(
        { _id: orderId, "items.productId": pid },
        {
          $inc: { "items.$.deliveredQty": deliverable },
          $set: { updatedAt: new Date() },
        },
        { session }
      );

      // If no positional update matched (happens when original order.items lacked productId),
      // attempt to match by productName and increment deliveredQty on the first item that has that name and has remaining quantity
      if (updateRes.matchedCount === 0) {
        // find index of the item with the same productName and remaining qty
        const orderDoc = await Order.findById(orderId).session(session);
        let updated = false;
        for (let idx = 0; idx < orderDoc.items.length; idx++) {
          const oi = orderDoc.items[idx];
          const ordered = Number(oi.quantity ?? oi.qty ?? 0);
          const prevDel = Number(oi.deliveredQty ?? 0);
          if ((oi.productId && oi.productId.toString() === pid) || (!oi.productId && oi.productName)) {
            // match either productId or same name (best-effort)
            const rem = Math.max(0, ordered - prevDel);
            if (rem > 0) {
              // update specific array index
              const incObj = {};
              incObj[`items.${idx}.deliveredQty`] = deliverable;
              await Order.updateOne({ _id: orderId }, { $inc: incObj, $set: { updatedAt: new Date() } }, { session });
              updated = true;
              break;
            }
          }
        }
        if (!updated) {
          // nothing updated — continue
          console.warn(`markOrderDelivered: could not increment deliveredQty for product ${pid} on order ${orderId}`);
        }
      }
    }

    // After processing all items, check if order is fully delivered
    const freshOrder = await Order.findById(orderId).session(session);
    const allDelivered = freshOrder.items.every((it) => (Number(it.deliveredQty ?? 0) >= Number(it.quantity ?? it.qty ?? 0)));

    if (allDelivered) {
      freshOrder.status = "completed";
      await freshOrder.save({ session });
    } else {
      await freshOrder.save({ session: session });
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return res.status(200).json({ success: true, message: "Delivery recorded" });
  } catch (err) {
    console.error("markOrderDelivered error:", err);
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (e) {
        // ignore
      }
    }
    return res.status(500).json({ success: false, message: "Failed to record delivery", error: err.message || err });
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
        await processDelivery(orderId, null); // deliver remaining
        return res.status(200).json({ success: true, message: "Order marked completed and delivery recorded" });
      } catch (procErr) {
        console.error("updateOrderStatus -> processDelivery failed:", procErr);
        return res.status(500).json({ success: false, message: procErr.message || "Failed to process delivery" });
      }
    }

    // other statuses
    order.status = status;
    await order.save();
    return res.status(200).json({ success: true, message: "Status updated", order });
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    return res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

/* ---------------------------------------------
  NEW: approveAndAssignDriver
  - Called by admin when approving + assigning a driver.
  - Sets driverId, status='accepted', saves order.
  - Attempts to create Google Calendar event (non-fatal).
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

    // assign driver and accept order
    order.driverId = driverId;
    order.status = "accepted";
    order.updatedAt = new Date();

    await order.save();

    // TRY to create calendar event — don't block approve flow if calendar fails
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

    // return updated order (lean simple)
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
};
