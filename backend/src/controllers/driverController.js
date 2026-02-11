import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Driver from "../models/driver.js";
import User from "../models/User.js"; 
import Order from "../models/order.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import { processDelivery } from "./orderController.js";


export const createDriverAccount = async (req, res) => {
  try {
    const { name, email, password, contactNumber, vehicleNumber } = req.body;

    if (!name || !email || !password || !contactNumber || !vehicleNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await Driver.findOne({ email });
    if (existing) return res.status(400).json({ message: "Driver already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const newDriver = await Driver.create({
      name,
      email,
      password: hashed,
      contactNumber,
      vehicleNumber,
      status: "available",
    });

    return res.status(201).json({ success: true, message: "Driver created", driver: newDriver });
  } catch (err) {
    console.error("createDriverAccount error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const registerDriver = async (req, res) => {
  try {
    const { name, email, password, contactNumber, vehicleNumber } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Missing fields" });

    const exists = await Driver.findOne({ email });
    if (exists) return res.status(400).json({ message: "Driver already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const driver = await Driver.create({
      name,
      email,
      password: hashed,
      contactNumber,
      vehicleNumber,
      status: "available",
    });

    res.status(201).json({ message: "Driver registered", driver });
  } catch (err) {
    console.error("registerDriver error:", err);
    res.status(500).json({ message: err.message });
  }
};


export const loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;
    const driver = await Driver.findOne({ email });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const ok = await bcrypt.compare(password, driver.password);
    if (!ok) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: driver._id, role: "driver" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

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
  } catch (err) {
    console.error("loginDriver error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * getDriverProfile
 */
export const getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id).select("-password");
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  } catch (err) {
    console.error("getDriverProfile error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * updateDriverProfile
 */
export const updateDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    driver.name = req.body.name ?? driver.name;
    driver.contactNumber = req.body.contactNumber ?? driver.contactNumber;
    driver.vehicleNumber = req.body.vehicleNumber ?? driver.vehicleNumber;

    if (req.body.password) {
      driver.password = await bcrypt.hash(req.body.password, 10);
    }

    const updated = await driver.save();
    res.json(updated);
  } catch (err) {
    console.error("updateDriverProfile error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * getAssignedOrders - driver sees assigned orders (accepted/delivering)
 */
export const getAssignedOrders = async (req, res) => {
  try {
    const driverId = req.user.id;
    const orders = await Order.find({
      driverId,
      status: { $in: ["accepted", "delivering"] },
    }).populate("customerId", "fullName phoneNumber email");

    res.json(orders);
  } catch (err) {
    console.error("getAssignedOrders error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * updateDeliveryStatus - update status for an order (driver only)
 */
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // ensure only assigned driver can change
    if (String(order.driverId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    order.status = status;
    await order.save();

    return res.json({ message: "Order status updated", order });
  } catch (err) {
    console.error("updateDeliveryStatus error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const uploadProofOfDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No file uploaded (expecting memory upload)" });
    }

    // helper to stream buffer to Cloudinary
    const streamUpload = (buffer) =>
      new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "water-delivery/proofs", resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
      });

    const result = await streamUpload(req.file.buffer);

    const secureUrl = result.secure_url || result.url;
    if (!secureUrl) {
      console.error("Cloudinary upload returned no url", result);
      return res.status(500).json({ message: "Cloudinary did not return a url" });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        proofOfDelivery: secureUrl,
        status: "completed",
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found after upload" });

    // mark driver available
    if (order.driverId) {
      try {
        await Driver.findByIdAndUpdate(order.driverId, { status: "available" });
      } catch (e) {
        console.warn("uploadProofOfDelivery: failed to mark driver available:", e);
      }
    }

    // call processDelivery to decrement stock and set deliveredQty
    try {
      console.log(`uploadProofOfDelivery: calling processDelivery for order ${orderId}`);
      const procResult = await processDelivery(orderId, null);
      console.log("uploadProofOfDelivery: processDelivery result:", procResult);
    } catch (procErr) {
      console.error("uploadProofOfDelivery: processDelivery error (stock may not be updated):", procErr);
    }

    return res.json({
      message: "Proof uploaded & order completed",
      proofUrl: secureUrl,
      order,
    });
  } catch (err) {
    console.error("uploadProofOfDelivery error:", err);
    return res.status(500).json({ message: err.message });
  }
};


export const getAllDriversAdmin = async (req, res) => {
  try {
    // Prefer dedicated Driver collection if it has entries
    const driverDocs = await Driver.find({}).select("-password").lean();
    if (Array.isArray(driverDocs) && driverDocs.length > 0) {
      return res.status(200).json({ success: true, drivers: driverDocs });
    }

    // Fallback to users collection where role === 'driver'
    const userDrivers = await User.find({ role: "driver" }).select("-password").lean();
    return res.status(200).json({ success: true, drivers: userDrivers });
  } catch (err) {
    console.error("getAllDriversAdmin error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch drivers", error: err.message });
  }
};

export default {
  createDriverAccount,
  registerDriver,
  loginDriver,
  getDriverProfile,
  updateDriverProfile,
  getAssignedOrders,
  updateDeliveryStatus,
  uploadProofOfDelivery,
  getAllDriversAdmin,
};
