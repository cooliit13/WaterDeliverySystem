// models/Order.js
import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: false,
  },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },         // ordered qty
  deliveredQty: { type: Number, default: 0 },         // <-- NEW: how many already delivered
  price: { type: Number, required: true },
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

    items: [OrderItemSchema], // use the sub-schema above

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

    // store geocoded coordinates for faster mapping
    deliveryLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
