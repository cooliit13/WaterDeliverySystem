import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ ADD ITEM TO CART
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Product and quantity are required"
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const index = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (index > -1) {
      cart.items[index].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    await cart.save();

    // ✅ Prevent populate error
    if (cart.items.length > 0) {
      await cart.populate("items.productId");
    }

    res.status(200).json({
      success: true,
      cart: { items: cart.items }
    });

  } catch (error) {
    console.log("Add cart error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ GET USER CART
router.get("/get", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });

    // ✅ Prevent populate error
    if (cart && cart.items.length > 0) {
      await cart.populate("items.productId");
    }

    res.status(200).json({
      success: true,
      cart: { items: cart?.items || [] }
    });

  } catch (error) {
    console.log("Get cart error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ UPDATE QUANTITY
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });

    const index = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    cart.items[index].quantity = quantity;

    await cart.save();

    // ✅ Prevent populate error
    if (cart.items.length > 0) {
      await cart.populate("items.productId");
    }

    res.status(200).json({
      success: true,
      cart: { items: cart.items }
    });

  } catch (error) {
    console.log("Update cart error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ REMOVE ITEM
router.delete("/remove/:productId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId });

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );

    await cart.save();

    // ✅ Prevent populate error
    if (cart.items.length > 0) {
      await cart.populate("items.productId");
    }

    res.status(200).json({
      success: true,
      cart: { items: cart.items }
    });

  } catch (error) {
    console.log("Remove cart error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
