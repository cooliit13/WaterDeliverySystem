import express from "express";
import Address from "../models/Address.js";

const router = express.Router();

// ✅ Get all addresses of a user
router.get("/get/:userId", async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.params.userId });

    res.status(200).json({
      success: true,
      addresses
    });
  } catch (error) {
    console.error("Get address error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Add new address
router.post("/add", async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);

    // ✅ FIX: map frontend keys to schema keys
    const mappedData = {
      userId: req.body.userId,
      address: req.body.street,
      city: req.body.province,
      pincode: req.body.postalCode,
      phone: req.body.phoneNumber,
      notes: req.body.notes || ""
    };

    const newAddress = await Address.create(mappedData);

    res.status(200).json({
      success: true,
      address: newAddress
    });
  } catch (error) {
    console.error("Add address error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Edit address
router.put("/update/:userId/:addressId", async (req, res) => {
  try {
    // ✅ FIX: map frontend keys to schema keys
    const mappedData = {
      address: req.body.street,
      city: req.body.province,
      pincode: req.body.postalCode,
      phone: req.body.phoneNumber,
      notes: req.body.notes || ""
    };

    const updated = await Address.findOneAndUpdate(
      {
        _id: req.params.addressId,
        userId: req.params.userId
      },
      mappedData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Address not found"
      });
    }

    res.status(200).json({
      success: true,
      address: updated
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Delete address
router.delete("/delete/:userId/:addressId", async (req, res) => {
  try {
    const deleted = await Address.findOneAndDelete({
      _id: req.params.addressId,
      userId: req.params.userId
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Address not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Address deleted"
    });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
