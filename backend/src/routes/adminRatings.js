import express from "express";
import Order from "../models/order.js";

const router = express.Router();

router.get("/products", async (req, res) => {
  try {
    const pipeline = [
      { $unwind: "$items" },
      { $match: { "items.customerRating": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$items.productId",
          avgRating: { $avg: "$items.customerRating" },
          ratingCount: { $sum: 1 },
          sampleFeedbacks: { $push: "$items.customerFeedback" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: "$_id",
          productName: "$product.name",
          avgRating: { $round: ["$avgRating", 2] },
          ratingCount: 1,
          sampleFeedbacks: { $slice: ["$sampleFeedbacks", 5] },
        },
      },
      { $sort: { avgRating: -1, ratingCount: -1 } },
    ];

    const results = await Order.aggregate(pipeline).allowDiskUse(true);
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("Admin product ratings error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching product ratings" });
  }
});

router.get("/drivers", async (req, res) => {
  try {
    const pipeline = [
      { $match: { driverRating: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$driverId",
          avgRating: { $avg: "$driverRating" },
          ratingCount: { $sum: 1 },
          sampleDriverFeedbacks: { $push: "$driverFeedback" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "driver",
        },
      },
      { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          driverId: "$_id",
          driverName: { $concat: ["$driver.firstname", " ", "$driver.lastname"] },
          avgRating: { $round: ["$avgRating", 2] },
          ratingCount: 1,
          sampleDriverFeedbacks: { $slice: ["$sampleDriverFeedbacks", 5] },
        },
      },
      { $sort: { avgRating: -1, ratingCount: -1 } },
    ];

    const results = await Order.aggregate(pipeline).allowDiskUse(true);
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("Admin driver ratings error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching driver ratings" });
  }
});

export default router;
