import Cart from "../models/cartModel.js";

// GET CART ITEMS
export const getCartItems = async (req, res) => {
  const userId = req.user.userId;

  try {
    const cartItems = await Cart.find({ userId }).populate("productId");

    return res.json({
      success: true,
      cart: {
        items: cartItems
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ADD TO CART
export const addToCart = async (req, res) => {
  const userId = req.user.userId;
  const { productId, quantity } = req.body;

  try {
    let item = await Cart.findOne({ userId, productId });

    if (item) {
      item.quantity += quantity;
      await item.save();
    } else {
      item = await Cart.create({ userId, productId, quantity });
    }

    const cartItems = await Cart.find({ userId }).populate("productId");

    return res.json({
      success: true,
      cart: {
        items: cartItems
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// UPDATE QUANTITY (+/-)
export const updateCart = async (req, res) => {
  const userId = req.user.userId;
  const { cartItemId, quantity } = req.body;

  try {
    let item = await Cart.findOne({ _id: cartItemId, userId });

    if (!item) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }

    item.quantity = quantity;
    await item.save();

    const cartItems = await Cart.find({ userId }).populate("productId");

    return res.json({
      success: true,
      cart: {
        items: cartItems
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// REMOVE ITEM
export const removeFromCart = async (req, res) => {
  const userId = req.user.userId;
  const { cartItemId } = req.body;

  try {
    await Cart.findOneAndDelete({ _id: cartItemId, userId });

    const cartItems = await Cart.find({ userId }).populate("productId");

    return res.json({
      success: true,
      cart: {
        items: cartItems
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
