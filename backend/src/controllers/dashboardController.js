import mongoose from "mongoose";
import Order from "../models/order.js";
import Product from "../models/Product.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const DAILY_TARGET = 200;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // --- DELIVERY sales (today) ---
    const deliveredTodayAgg = await Order.aggregate([
      // completed deliveries updated today (or use delivery/completed timestamps)
      { $match: { status: "completed", updatedAt: { $gte: start, $lte: end } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalDeliveredQty: { $sum: { $ifNull: ["$items.deliveredQty", "$items.quantity", 0] } },
          deliveryRevenueToday: {
            $sum: {
              $multiply: [
                { $ifNull: ["$items.deliveredQty", "$items.quantity", 0] },
                { $ifNull: ["$items.price", 0] },
              ],
            },
          },
        },
      },
    ]);

    const totalDeliveredToday =
      (deliveredTodayAgg[0] && deliveredTodayAgg[0].totalDeliveredQty) || 0;
    const deliveryRevenueToday =
      (deliveredTodayAgg[0] && deliveredTodayAgg[0].deliveryRevenueToday) || 0;

    // --- DELIVERY sales (all time) ---
    const deliveredAllTimeAgg = await Order.aggregate([
      { $match: { status: "completed" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          deliveryRevenueAllTime: {
            $sum: {
              $multiply: [
                { $ifNull: ["$items.deliveredQty", "$items.quantity", 0] },
                { $ifNull: ["$items.price", 0] },
              ],
            },
          },
        },
      },
    ]);

    const deliveryRevenueAllTime =
      (deliveredAllTimeAgg[0] && deliveredAllTimeAgg[0].deliveryRevenueAllTime) || 0;

    // --- POS (walk-in) sales
    const conn = mongoose.connection;
    const possibleCollections = ["pos", "possales", "pos_sales", "sales", "walkin_sales", "posSales"];
    let posRevenueToday = 0;
    let posRevenueAllTime = 0;
    for (const colName of possibleCollections) {
      if (await conn.db.listCollections({ name: colName }).hasNext()) {
        try {
          const col = conn.collection(colName);

          // today
          const todayMatch = {
            createdAt: { $gte: start, $lte: end },
          };
          const todayAgg = await col
            .aggregate([
              { $match: todayMatch },
              // assume documents have either totals.total or total, or items array with qty/price
              {
                $project: {
                  total1: "$totals.total",
                  total2: "$total",
                  items: 1,
                },
              },
              {
                $addFields: {
                  inferredTotal: {
                    $cond: [
                      { $gt: ["$total1", 0] },
                      "$total1",
                      { $cond: [{ $gt: ["$total2", 0] }, "$total2", 0] },
                    ],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  posToday: { $sum: "$inferredTotal" },
                },
              },
            ])
            .toArray();

          posRevenueToday += (todayAgg[0] && Number(todayAgg[0].posToday)) || 0;

          // all-time
          const allAgg = await col
            .aggregate([
              {
                $project: {
                  total1: "$totals.total",
                  total2: "$total",
                  items: 1,
                },
              },
              {
                $addFields: {
                  inferredTotal: {
                    $cond: [
                      { $gt: ["$total1", 0] },
                      "$total1",
                      { $cond: [{ $gt: ["$total2", 0] }, "$total2", 0] },
                    ],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  posAll: { $sum: "$inferredTotal" },
                },
              },
            ])
            .toArray();

          posRevenueAllTime += (allAgg[0] && Number(allAgg[0].posAll)) || 0;
        } catch (err) {
          console.warn(`pos aggregation failed for ${colName}:`, err.message || err);
          // continue trying other names
        }
      }
    }

    // --- total stock
    const stockAgg = await Product.aggregate([
      { $group: { _id: null, totalStock: { $sum: { $ifNull: ["$stock", 0] } } } },
    ]);
    const totalStock = (stockAgg[0] && stockAgg[0].totalStock) || 0;

    // --- totals combined
    const totalRevenueToday = deliveryRevenueToday + posRevenueToday;
    const totalRevenueAllTime = deliveryRevenueAllTime + posRevenueAllTime;

    return res.status(200).json({
      success: true,
      dailyTarget: DAILY_TARGET,
      totalDeliveredToday,
      deliveryRevenueToday,
      posRevenueToday,
      totalRevenueToday,
      deliveryRevenueAllTime,
      posRevenueAllTime,
      totalRevenueAllTime,
      totalStock,
      remainingToTarget: Math.max(0, DAILY_TARGET - totalDeliveredToday),
    });
  } catch (err) {
    console.error("getDashboardSummary error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard summary" });
  }
};

export default { getDashboardSummary };
