import mongoose from "mongoose";

const PosItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: false },
  name: { type: String },
  qty: { type: Number, default: 1 },
  price: { type: Number, default: 0 },
});

const PosSaleSchema = new mongoose.Schema(
  {
    customer: {
      customerName: { type: String },
      phone: { type: String },
      note: { type: String },
    },
    items: [PosItemSchema],
    totals: {
      subtotal: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

export default mongoose.model("PosSale", PosSaleSchema);
