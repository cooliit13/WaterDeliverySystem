import Order from '../models/Order.js';

// Create new order
export const createOrder = async (req, res) => {
  try {
    const { customer, items, totalPrice, deliveryAddress } = req.body;

    const newOrder = await Order.create({
      customer,
      items,
      totalPrice,
      deliveryAddress,
    });

    res.status(201).json({
      message: 'Order created successfully!',
      order: newOrder,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('customer', 'name email');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
