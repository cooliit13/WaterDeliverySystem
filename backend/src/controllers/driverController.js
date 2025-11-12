import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Driver from "../models/driver.js";
import Order from "../models/order.js";   // ✅ REQUIRED

// ✅ REGISTER DRIVER
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



// ✅ LOGIN DRIVER
export const loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;

    const driver = await Driver.findOne({ email });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: driver._id, role: "driver" },   // ✅ FIXED (id, not userId)
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



// ✅ GET DRIVER PROFILE
export const getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id).select("-password");   // ✅ FIXED

    if (!driver) return res.status(404).json({ message: "Driver not found" });

    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ✅ UPDATE DRIVER PROFILE
export const updateDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);   // ✅ FIXED

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




// DRIVER GETS ASSIGNED & APPROVED ORDERS
export const getAssignedOrders = async (req, res) => {
  try {
    const driverId = req.user.id; // driver ID from JWT

    // Fetch orders assigned to this driver with status "accepted" or "delivering"
    const orders = await Order.find({
      driverId: driverId,
      status: { $in: ["accepted", "delivering"] },
    }).populate("customerId", "fullName phoneNumber email"); // include customer info

    res.json(orders);
  } catch (error) {
    console.error("Driver getAssignedOrders error:", error);
    res.status(500).json({ message: error.message });
  }
};




// ✅ UPDATE DELIVERY STATUS
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.driverId?.toString() !== req.user.id) {   // ✅ FIXED
      return res.status(403).json({ message: "Not authorized" });
    }

    order.status = status;
    await order.save();

    res.json({ message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ✅ UPLOAD PROOF OF DELIVERY
// ✅ UPLOAD PROOF OF DELIVERY (driverController.js)
export const uploadProofOfDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const proofOfDelivery = "/uploads/proofs/" + req.file.filename;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        proofOfDelivery, // ✅ same name as in order.js
        status: "completed",
      },
      { new: true }
    );

    // ✅ Make driver available again
    if (order.driverId) {
      await Driver.findByIdAndUpdate(order.driverId, { status: "available" });
    }

    res.json({ message: "Proof uploaded successfully", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

