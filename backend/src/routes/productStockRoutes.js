import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";
import Admin from "../models/admin.js";

const router = express.Router();


const COOLDOWN_MS = 60 * 1000;


router.put("/stock/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const stock = Number(req.body.stock ?? NaN);
    if (!Number.isFinite(stock) || stock < 0) {
      return res.status(400).json({ success: false, message: "Invalid stock" });
    }

    // try to resolve acting admin name (best-effort)
    let actingAdminName = null;
    try {
      const a = await Admin.findById(req.user.id).select("name email").lean();
      actingAdminName = a?.name || a?.email || null;
    } catch (e) {
      // ignore
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      {
        $set: { stock, updatedBy: { id: req.user.id, name: actingAdminName } },
        $inc: { __v: 1 },
        $currentDate: { updatedAt: true },
      },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ success: false, message: "Product not found" });
    return res.status(200).json({ success: true, product: updated });
  } catch (err) {
    console.error("update stock (legacy PUT) error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/:id/stock", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const maybeDelta = req.body.delta;
    const maybeNewStock = req.body.newStock;
    const clientUpdatedAt = req.body.clientUpdatedAt;

    // Validate input: require at least one of delta or newStock
    if (maybeDelta === undefined && maybeNewStock === undefined) {
      return res.status(400).json({ success: false, message: "Provide delta or newStock" });
    }

    // validate numeric values
    const hasDelta = maybeDelta !== undefined;
    const hasNewStock = maybeNewStock !== undefined;

    if (hasDelta && !Number.isFinite(Number(maybeDelta))) {
      return res.status(400).json({ success: false, message: "Invalid delta" });
    }
    if (hasNewStock && (!Number.isFinite(Number(maybeNewStock)) || Number(maybeNewStock) < 0)) {
      return res.status(400).json({ success: false, message: "Invalid newStock" });
    }

    // fetch current product (for cooldown check)
    const current = await Product.findById(id).lean();
    if (!current) return res.status(404).json({ success: false, message: "Product not found" });

    const lastUpdate = new Date(current.updatedAt || current.createdAt || 0);
    const elapsed = Date.now() - lastUpdate.getTime();

    // If cooldown not passed -> deny with 429 and include latest product / who updated
    if (elapsed < COOLDOWN_MS) {
      const secondsLeft = Math.ceil((COOLDOWN_MS - elapsed) / 1000);

      return res.status(429).json({
        success: false,
        message: `You cannot update this product yet. It was updated ${Math.floor(elapsed / 1000)} seconds ago.`,
        waitSeconds: secondsLeft,
        updatedBy: current.updatedBy?.name ?? null,
        product: current,
      });
    }

    // resolve acting admin name (best-effort)
    let actingAdminName = null;
    try {
      const a = await Admin.findById(req.user.id).select("name email").lean();
      actingAdminName = a?.name || a?.email || null;
    } catch (e) {
      // ignore
    }

    // If no clientUpdatedAt provided -> apply update directly (legacy)
    if (!clientUpdatedAt) {
      if (hasNewStock) {
        const updated = await Product.findByIdAndUpdate(
          id,
          {
            $set: { stock: Number(maybeNewStock), updatedBy: { id: req.user.id, name: actingAdminName } },
            $inc: { __v: 1 },
            $currentDate: { updatedAt: true },
          },
          { new: true }
        ).lean();

        if (!updated) return res.status(404).json({ success: false, message: "Product not found" });
        return res.status(200).json({ success: true, product: updated });
      } else {
        // delta present
        const updated = await Product.findByIdAndUpdate(
          id,
          {
            $inc: { stock: Number(maybeDelta), __v: 1 },
            $set: { updatedBy: { id: req.user.id, name: actingAdminName } },
            $currentDate: { updatedAt: true },
          },
          { new: true }
        ).lean();

        if (!updated) return res.status(404).json({ success: false, message: "Product not found" });

        // if negative, clamp to 0
        if (updated.stock < 0) {
          const fixed = await Product.findByIdAndUpdate(
            id,
            { $set: { stock: 0 }, $inc: { __v: 1 }, $currentDate: { updatedAt: true } },
            { new: true }
          ).lean();
          return res.status(200).json({
            success: true,
            product: fixed,
            message: "Stock adjusted but cannot go below 0 — set to 0",
          });
        }

        return res.status(200).json({ success: true, product: updated });
      }
    }

    // clientUpdatedAt provided -> guarded update
    const guardDate = new Date(clientUpdatedAt);
    if (Number.isNaN(guardDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid clientUpdatedAt format" });
    }

    // Build update object depending on delta vs newStock
    let updateObj = { $inc: { __v: 1 }, $currentDate: { updatedAt: true }, $set: { updatedBy: { id: req.user.id, name: actingAdminName } } };
    if (hasNewStock) {
      updateObj.$set.stock = Number(maybeNewStock);
    } else {
      updateObj.$inc.stock = Number(maybeDelta);
    }

    // Attempt guarded atomic update: match on updatedAt
    const updatedGuarded = await Product.findOneAndUpdate(
      { _id: id, updatedAt: guardDate },
      updateObj,
      { new: true }
    ).lean();

    if (!updatedGuarded) {
      // conflict: return current doc
      const latest = await Product.findById(id).lean();
      if (!latest) return res.status(404).json({ success: false, message: "Product not found" });
      return res.status(409).json({
        success: false,
        message: "Conflict: product changed since you opened it. Please refresh and retry.",
        product: latest,
      });
    }

    // if stock dipped negative (possible when using delta) clamp to 0
    if (updatedGuarded.stock < 0) {
      const fixed = await Product.findByIdAndUpdate(
        id,
        { $set: { stock: 0, updatedBy: { id: req.user.id, name: actingAdminName } }, $inc: { __v: 1 }, $currentDate: { updatedAt: true } },
        { new: true }
      ).lean();
      return res.status(200).json({
        success: true,
        product: fixed,
        message: "Stock adjusted but cannot go below 0 — set to 0",
      });
    }

    return res.status(200).json({ success: true, product: updatedGuarded });
  } catch (err) {
    console.error("guarded product stock update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
