import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Driver from "../models/driver.js";
import Order from "../models/order.js";

//  Register Driver
export const registerDriver = async (req, res) => {
  try {
    const { name, email, password, contactNumber, vehicleNumber } = req.body;

    const existingDriver = await Driver.findOne({ email });
    if (existingDriver) {
      return res.status(400).json({ message: "Driver already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newDriver = await Driver.create({
      name,
      email,
      password: hashedPassword,
      contactNumber,
      vehicleNumber,
      status: "available",
    });

    res.status(201).json({
      message: "Driver registered successfully",
      driver: newDriver,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Login Driver
export const loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;

    const driver = await Driver.findOne({ email });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: driver._id, role: "driver" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        status: driver.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Get Driver Profile
export const getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id).select("-password");
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Update Driver Profile
export const updateDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    driver.name = req.body.name || driver.name;
    driver.contactNumber = req.body.contactNumber || driver.contactNumber;
    driver.vehicleNumber = req.body.vehicleNumber || driver.vehicleNumber;

    if (req.body.password) {
      driver.password = await bcrypt.hash(req.body.password, 10);
    }

    const updatedDriver = await driver.save();
    res.json(updatedDriver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  View Assigned Orders
export const getAssignedOrders = async (req, res) => {
  try {
    const orders = await Order.find({ driver: req.user.id }).populate("customer");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Update Delivery Status
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.driver.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    order.status = status || order.status;
    await order.save();

    res.json({ message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
