import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/admin.js";
import User from "../models/User.js";
import Customer from "../models/customer.js";
import Driver from "../models/driver.js";
import Order from "../models/order.js";

// 1 minute cooldown
const COOLDOWN_MS = 60 * 1000;

// Register Admin
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    res.status(201).json({
      message: "Admin registered successfully",
      admin: newAdmin,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login Admin
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin profile
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { status, clientUpdatedAt } = req.body;
    const userId = req.params.id;

    if (!status) return res.status(400).json({ message: "Missing status" });

    // --- fetch user for cooldown check ---
    const userRecord = await User.findById(userId).select("-password");
    if (!userRecord) return res.status(404).json({ message: "User not found" });

    const lastUpdate = new Date(userRecord.updatedAt);
    const elapsed = Date.now() - lastUpdate.getTime();

    if (elapsed < COOLDOWN_MS) {
      const secondsLeft = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return res.status(429).json({
        message: `You cannot update this user yet. Another admin updated this record ${Math.floor(elapsed / 1000)} seconds ago.`,
        waitSeconds: secondsLeft,
        updatedBy: userRecord.updatedBy ? userRecord.updatedBy.name : null,
        user: userRecord
      });
    }

    // find acting admin name
    let actingAdminName = null;
    try {
      const acting = await Admin.findById(req.user.id).select("name email");
      actingAdminName = acting?.name || acting?.email || null;
    } catch (e) {
      // ignore
    }

    // --- TIMESTAMP MATCH CHECK ---
    if (!clientUpdatedAt) {
      // No guard provided => apply update but stamp updatedBy
      const updated = await User.findByIdAndUpdate(
        userId,
        { $set: { status, updatedBy: { id: req.user.id, name: actingAdminName } }, $currentDate: { updatedAt: true } },
        { new: true }
      ).select("-password");

      if (!updated) return res.status(404).json({ message: "User not found" });
      return res.json({ message: `User status updated to ${status}`, user: updated });
    }

    const guardDate = new Date(clientUpdatedAt);
    if (Number.isNaN(guardDate.getTime())) {
      return res.status(400).json({ message: "Invalid clientUpdatedAt" });
    }

    const updated = await User.findOneAndUpdate(
      { _id: userId, updatedAt: guardDate },
      { $set: { status, updatedBy: { id: req.user.id, name: actingAdminName } }, $currentDate: { updatedAt: true } },
      { new: true }
    ).select("-password");

    if (!updated) {
      const current = await User.findById(userId).select("-password");
      return res.status(409).json({
        message: "Conflict: another admin updated this user. Please refresh.",
        user: current,
      });
    }

    return res.json({ message: `User status updated to ${status}`, user: updated });
  } catch (error) {
    console.error("updateUserStatus (timestamp) error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role, clientUpdatedAt } = req.body;
    const targetId = req.params.id;

    if (!role) return res.status(400).json({ message: "Missing role" });

    // --- fetch user for cooldown check ---
    const userRecord = await User.findById(targetId).select("-password");
    if (!userRecord) return res.status(404).json({ message: "User not found" });

    const lastUpdate = new Date(userRecord.updatedAt);
    const elapsed = Date.now() - lastUpdate.getTime();

    if (elapsed < COOLDOWN_MS) {
      const secondsLeft = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return res.status(429).json({
        message: `You cannot change the role yet. Another admin edited this ${Math.floor(elapsed / 1000)} seconds ago.`,
        waitSeconds: secondsLeft,
        updatedBy: userRecord.updatedBy ? userRecord.updatedBy.name : null,
        user: userRecord
      });
    }

    // find acting admin name (best-effort)
    let actingAdminName = null;
    try {
      const acting = await Admin.findById(req.user.id).select("name email");
      actingAdminName = acting?.name || acting?.email || null;
    } catch (e) {
      // ignore
    }

    // --- TIMESTAMP MATCH CHECK ---
    if (!clientUpdatedAt) {
      const user = await User.findByIdAndUpdate(
        targetId,
        { $set: { role, updatedBy: { id: req.user.id, name: actingAdminName } }, $currentDate: { updatedAt: true } },
        { new: true }
      ).select("-password");
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json({ message: "User role updated", user });
    }

    const guardDate = new Date(clientUpdatedAt);
    if (Number.isNaN(guardDate.getTime())) {
      return res.status(400).json({ message: "Invalid clientUpdatedAt" });
    }

    const updated = await User.findOneAndUpdate(
      { _id: targetId, updatedAt: guardDate },
      { $set: { role, updatedBy: { id: req.user.id, name: actingAdminName } }, $currentDate: { updatedAt: true } },
      { new: true }
    ).select("-password");

    if (!updated) {
      const current = await User.findById(targetId).select("-password");
      return res.status(409).json({
        message: "Conflict: another admin changed the role. Please refresh.",
        user: current
      });
    }

    return res.json({ message: "User role updated", user: updated });
  } catch (error) {
    console.error("updateUserRole (timestamp) error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all customers
export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().select("-password");
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all drivers
export const getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().select("-password");
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Approve Order and Assign Driver (unchanged)
export const approveOrder = async (req, res) => {
  try {
    const { orderId, driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({ message: "Driver is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "accepted";
    order.driverId = driverId;
    order.assignedAt = new Date();

    await order.save();

    res.json({
      message: "Order approved and assigned to driver",
      order,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders (unchanged)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customerId", "name email")
      .populate("driverId", "name email");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
