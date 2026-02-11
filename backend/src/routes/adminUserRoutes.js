import express from "express";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, "firstname lastname email role phone status")
      .sort({ createdAt: -1 });

    const formatted = users.map(u => ({
      id: u._id,
      name: `${u.firstname} ${u.lastname}`,
      email: u.email,
      role: u.role,
      phone: u.phone || "",
      status: u.status || "active",
    }));

    res.json(formatted);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});


router.get("/drivers", authMiddleware, async (req, res) => {
  try {
    const drivers = await User.find({ role: "driver" }, "firstname lastname phone status")
      .sort({ createdAt: -1 });

    const formatted = drivers.map(d => ({
      id: d._id,
      name: `${d.firstname} ${d.lastname}`,
      phone: d.phone || "",
      status: d.status || "active",
    }));

    res.json(formatted);
  } catch (err) {
    console.error("GET DRIVERS ERROR:", err);
    res.status(500).json({ message: "Error fetching drivers" });
  }
});

router.patch("/users/:id/role", authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;

    await User.findByIdAndUpdate(req.params.id, { role });

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE ROLE ERROR:", err);
    res.status(500).json({ message: "Failed to update role" });
  }
});


router.patch("/drivers/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    await User.findByIdAndUpdate(req.params.id, { status });

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE DRIVER STATUS ERROR:", err);
    res.status(500).json({ message: "Failed to update driver status" });
  }
});

export default router;
