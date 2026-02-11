import PosSale from "../models/PosSale.js";

export const listPosSales = async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 50);

    const sales = await PosSale.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, sales });
  } catch (err) {
    console.error("listPosSales error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch POS sales" });
  }
};
export const createPosSale = async (req, res) => {
  try {
    const payload = req.body || {};

    const items = Array.isArray(payload.items) ? payload.items : [];
    const totals = payload.totals ?? { subtotal: 0, tax: 0, total: 0 };
    const total = Number(totals.total ?? payload.total ?? 0);

    // Basic validation: require either items or a non-zero total
    if (items.length === 0 && !total) {
      return res.status(400).json({ success: false, message: "Missing items or total for sale" });
    }

    const doc = await PosSale.create({
      items,
      totals,
      customer: payload.customer ?? undefined,
      note: payload.note ?? undefined,
      createdBy: req.user?._id ?? undefined, 
    });

    return res.status(201).json({ success: true, sale: doc });
  } catch (err) {
    console.error("createPosSale error:", err);
    return res.status(500).json({ success: false, message: "Failed to create POS sale" });
  }
};

export default { listPosSales, createPosSale };
