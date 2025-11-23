// backend/src/models/order.js
import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: false,
  },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },         // ordered qty
  deliveredQty: { type: Number, default: 0 },         // how many delivered
  price: { type: Number, required: true },

  // per-item fields (kept for compatibility; not used in simplified Option A)
  customerRating: { type: Number, min: 0, max: 5 },
  customerFeedback: { type: String },
});

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Driver reference
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignedAt: {
      type: Date,
    },

    proofOfDelivery: {
      type: String,
    },

    items: [OrderItemSchema],

    totalAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "delivering", "completed", "cancelled"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },

    deliveryAddress: {
      type: String,
      required: true,
    },

    deliveryDate: {
      type: Date,
    },

    deliveryLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // ---------- Option A: General ratings/feedback ----------
    productRating: { type: Number, min: 0, max: 5 }, // general product rating for the order
    productFeedback: { type: String },

    driverRating: { type: Number, min: 0, max: 5 },  // rating for the driver
    driverFeedback: { type: String },

    // prevent double submission
    feedbackSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
