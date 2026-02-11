import mongoose from "mongoose";

const IdempotencyKeySchema = new mongoose.Schema({
  operationId: { type: String, required: true, unique: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  delta: Number,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.IdempotencyKey || mongoose.model("IdempotencyKey", IdempotencyKeySchema);
