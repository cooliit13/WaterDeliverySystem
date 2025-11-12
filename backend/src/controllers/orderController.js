import Order from "../models/order.js";
import { calendar } from "../utils/googleCalendar.js"; // ✅ Google Calendar integration

/* ---------------------------------------------
  CUSTOMER REQUEST PURCHASE
---------------------------------------------- */
export const requestPurchase = async (req, res) => {
  console.log("🔥 Incoming Request Body:", JSON.stringify(req.body, null, 2));

  try {
    const { userId, cartItems, totalAmount, addressInfo, deliveryDate } = req.body;

    if ((!userId && !req.body.customerId) || !cartItems || !cartItems.length || !totalAmount || !addressInfo) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const formattedItems = cartItems.map((item) => ({
      productName: item.productName || "Unknown Product",
      quantity: item.quantity,
      price: item.price,
    }));

    const formattedAddress = `
${addressInfo.address}, 
${addressInfo.city}, 
${addressInfo.pincode}
Phone: ${addressInfo.phone}
Notes: ${addressInfo.notes || "None"}
`.trim();

    const customerId = req.body.customerId || userId;

    const newOrder = await Order.create({
      customerId,
      items: formattedItems,
      totalAmount,
      deliveryAddress: formattedAddress,
      status: "pending",
      paymentStatus: "unpaid",
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
    });

    // ✅ Add Google Calendar event for delivery
    if (deliveryDate) {
      await calendar.events.insert({
        calendarId: "primary",
        resource: {
          summary: "Water Delivery",
          description: `Delivery for ${customerId}`,
          start: { dateTime: deliveryDate },
          end: { dateTime: deliveryDate },
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Purchase request successfully submitted",
      order: newOrder,
    });
  } catch (err) {
    console.error("Request purchase error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Failed to submit purchase request.",
    });
  }
};

/* ---------------------------------------------
  GET BOOKED DELIVERY DATES (for calendar)
---------------------------------------------- */
export const getBookedDeliveryDates = async (req, res) => {
  try {
    // ✅ Fetch only pending/approved deliveries (exclude canceled or completed)
    const orders = await Order.find(
      { status: { $in: ["pending", "approved", "processing"] } },
      "deliveryDate -_id"
    );

    // Format dates to YYYY-MM-DD
    const bookedDates = orders
      .map((order) => {
        if (order.deliveryDate) {
          const date = new Date(order.deliveryDate);
          return date.toISOString().split("T")[0];
        }
        return null;
      })
      .filter(Boolean);

    res.status(200).json({ bookedDates });
  } catch (error) {
    console.error("Error fetching booked delivery dates:", error);
    res.status(500).json({ message: "Failed to fetch booked delivery dates" });
  }
};
