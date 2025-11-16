// backend/src/routes/productStockRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";

const router = express.Router();

// PUT /api/admin/products/stock/:id -> body { stock: Number }
router.put("/stock/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const stock = Number(req.body.stock ?? NaN);
    if (!Number.isFinite(stock) || stock < 0) {
      return res.status(400).json({ success: false, message: "Invalid stock" });
    }
    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: { stock } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Product not found" });
    return res.status(200).json({ success: true, product: updated });
  } catch (err) {
    console.error("update stock error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
