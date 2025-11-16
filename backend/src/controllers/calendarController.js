import Order from "../models/order.js"; 
import { createEventForOrder } from "../utils/googleCalendar.js";


export const addOrderToCalendar = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: "Order id required" });

    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const event = await createEventForOrder(order);
    if (!event) return res.status(200).json({ success: true, message: "No event created (missing delivery date or calendar disabled)" });

    return res.status(200).json({ success: true, message: "Event created", event });
  } catch (err) {
    console.error("addOrderToCalendar error:", err);
    return res.status(500).json({ success: false, message: "Failed to add order to calendar" });
  }
};

export default { addOrderToCalendar };
