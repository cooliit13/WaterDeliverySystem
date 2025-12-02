// backend/src/controllers/adminBackupController.js
import Product from "../models/Product.js";
import Order from "../models/order.js";
import Customer from "../models/customer.js";
import Driver from "../models/driver.js";
import Admin from "../models/admin.js";
import User from "../models/User.js";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * createBackupExport
 * - Collects core collections into a single JSON object
 * - Streams it back as a downloadable attachment: admin-backup-<iso>.json
 *
 * Note: this is meant for on-demand exports and convenience. Use Atlas snapshots for production backup/restore.
 */
export const createBackupExport = async (req, res) => {
  try {
    // SECURITY: allow only admins (assumes authMiddleware already ran and req.user.role available)
    if (!req.user || (req.user.role && req.user.role !== "admin" && req.user.role !== "superadmin")) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Fetch data (limit fields if needed)
    const [products, orders, customers, drivers, users, admins] = await Promise.all([
      Product.find().lean(),
      Order.find().lean(),
      Customer.find().lean(),
      Driver.find().lean(),
      User.find().select("-password").lean(),
      Admin.find().select("-password").lean(),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      counts: {
        products: products.length,
        orders: orders.length,
        customers: customers.length,
        drivers: drivers.length,
        users: users.length,
        admins: admins.length,
      },
      products,
      orders,
      customers,
      drivers,
      users,
      admins,
    };

    // Stream back as JSON file attachment
    const iso = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `admin-backup-${iso}.json`;

    // Set headers for download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    // Stream JSON in a memory-friendly way
    // Convert to JSON string and send — for very large datasets consider pagination + zip
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error("createBackupExport error:", err);
    return res.status(500).json({ success: false, message: "Failed to create backup export" });
  }
};
