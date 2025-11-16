import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import Order from "../models/order.js";
import Product from "../models/Product.js";
import connectDB from "../config/db.js";

(async () => {
  try {
    await connectDB();
    const orders = await Order.find({ "items.productId": { $exists: false } }).lean();
    console.log("Orders to patch:", orders.length);
    for (const ord of orders) {
      let changed = false;
      for (let i = 0; i < ord.items.length; i++) {
        const it = ord.items[i];
        if (!it.productId && it.productName) {
          const prod = await Product.findOne({ $or: [{ name: it.productName }, { title: it.productName }] }).lean();
          if (prod) {
            await Order.updateOne(
              { _id: ord._id, [`items.${i}.productName`]: it.productName },
              { $set: { [`items.${i}.productId`]: prod._id, [`items.${i}.deliveredQty`]: Number(it.deliveredQty || 0) } }
            );
            changed = true;
            console.log(`Patched order ${ord._id} item ${i} -> productId ${prod._id}`);
          }
        } else if (!it.deliveredQty) {
          // ensure deliveredQty exists
          await Order.updateOne({ _id: ord._id }, { $set: { [`items.${i}.deliveredQty`]: Number(it.deliveredQty || 0) } });
          changed = true;
        }
      }
      if (changed) console.log("Patched order", ord._id.toString());
    }
    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
