// cartController.js
export const getCartItems = async (req, res) => {
  const userId = req.user.userId; // from JWT
  try {
    const cart = await Cart.find({ userId }).populate("productId");
    res.json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
