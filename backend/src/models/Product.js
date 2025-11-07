import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  image: { type: String, required: true }, // URL to the image stored
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin who uploaded
}, { timestamps: true });

export default mongoose.model("Product", productSchema);
