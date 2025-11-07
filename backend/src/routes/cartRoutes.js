import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getCartItems } from "../controllers/cartController.js";

const router = express.Router();

// ✅ Add item to cart
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || !quantity)
      return res.status(400).json({ success: false, message: "Missing fields" });

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    // Find existing cart or create new
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if product already in cart
    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
    if (itemIndex > -1) {
      // Update quantity
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    await cart.save();

    res.status(200).json({ success: true, message: "Added to cart", cart });
  } catch (error) {
    console.error("Cart add error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Get user's cart items
router.get("/get/:userId", authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId }).populate("items.productId");
    if (!cart) return res.status(200).json({ success: true, cart: { items: [] } });

    res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Update quantity of a specific item in the user's cart
router.put("/update-cart", authMiddleware, async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || quantity == null)
      return res.status(400).json({ success: false, message: "Missing fields" });

    const cart = await Cart.findOne({ userId });
    if (!cart)
      return res.status(404).json({ success: false, message: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1)
      return res.status(404).json({ success: false, message: "Product not found in cart" });

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    res.status(200).json({ success: true, message: "Cart updated", cart });
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
