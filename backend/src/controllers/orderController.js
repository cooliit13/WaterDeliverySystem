// backend/src/controllers/orderController.js
import Order from "../models/order.js";
import { calendar } from "../utils/googleCalendar.js";
import { geocodeAddress } from "../utils/geocode.js"; // <-- added

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

    // ---------- NEW: Try to geocode the delivery address (best-effort) ----------
    let deliveryLocation = null;
    try {
      deliveryLocation = await geocodeAddress(formattedAddress);
      if (deliveryLocation) {
        console.log("Geocoded address:", formattedAddress, "->", deliveryLocation);
      } else {
        console.log("Geocode returned no result for:", formattedAddress);
      }
    } catch (gErr) {
      console.error("Geocoding failed (continuing):", gErr);
      deliveryLocation = null;
    }
    // -------------------------------------------------------------------------

    const newOrder = await Order.create({
      customerId,
      items: formattedItems,
      totalAmount,
      deliveryAddress: formattedAddress,
      deliveryLocation, // saved (may be null)
      status: "pending",
      paymentStatus: "unpaid",
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
    });

    // Add Google Calendar event for delivery (app-level calendar)
    if (deliveryDate) {
      try {
        await calendar.events.insert({
          calendarId: "primary",
          resource: {
            summary: "Water Delivery",
            description: `Delivery for ${customerId}`,
            start: { dateTime: deliveryDate },
            end: { dateTime: deliveryDate },
          },
        });
      } catch (calErr) {
        console.error("Google Calendar insert error:", calErr);
      }
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
  DRIVER: GET ASSIGNED ORDERS
---------------------------------------------- */
export const getDriverOrders = async (req, res) => {
  try {
    // If driverId is supplied as param use it, otherwise use authenticated user if available
    const driverId = req.params.driverId || (req.user && (req.user.id || req.user.userId));
    if (!driverId) {
      return res.status(400).json({ success: false, message: "Driver ID required" });
    }

    const orders = await Order.find({
      driverId,
      status: { $in: ["accepted", "delivering"] },
    })
      .populate("customerId", "fullName email phoneNumber profileImage")
      .sort({ deliveryDate: 1 });

    // return plain array (frontend expects array)
    return res.status(200).json(orders);
  } catch (err) {
    console.error("Driver Orders Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch driver orders",
    });
  }
};

/* ---------------------------------------------
  GET BOOKED DELIVERY DATES (for calendar / frontend)
---------------------------------------------- */
export const getBookedDeliveryDates = async (req, res) => {
  try {
    // Return dates for orders that are still active (pending / accepted / delivering)
    const orders = await Order.find(
      { status: { $in: ["pending", "accepted", "delivering"] } },
      "deliveryDate -_id"
    );

    const bookedDates = orders
      .map((o) => {
        if (o.deliveryDate) {
          return new Date(o.deliveryDate).toISOString().split("T")[0]; // YYYY-MM-DD
        }
        return null;
      })
      .filter(Boolean);

    return res.status(200).json({ bookedDates });
  } catch (err) {
    console.error("Error fetching booked delivery dates:", err);
    return res.status(500).json({ message: "Failed to fetch booked delivery dates" });
  }
};
