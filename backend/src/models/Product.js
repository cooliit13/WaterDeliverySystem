import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  image: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// include virtuals when converting to JSON / plain object
productSchema.set("toObject", { virtuals: true });
productSchema.set("toJSON", { virtuals: true });

// aliases frontend may expect
productSchema.virtual("title").get(function () {
  return this.name;
});
productSchema.virtual("productName").get(function () {
  return this.name;
});
productSchema.virtual("id").get(function () {
  return this._id ? String(this._id) : undefined;
});

export default mongoose.model("Product", productSchema);
