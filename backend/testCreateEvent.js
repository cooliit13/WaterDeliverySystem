// testCreateEvent.js
import dotenv from "dotenv";
dotenv.config();
import { createEventForOrder } from "./src/utils/googleCalendar.js";

(async () => {
  const fakeOrder = {
    _id: "TEST-ORDER-123",
    customer: { name: "Test Customer" },
    items: [{ name: "5-gallon", qty: 1 }],
    deliveryAddress: "Makati, Metro Manila",
    deliveryDate: new Date(Date.now() + 24*60*60*1000).toISOString() // tomorrow
  };

  try {
    const ev = await createEventForOrder(fakeOrder);
    console.log("EVENT CREATED:", ev?.htmlLink || ev);
  } catch (err) {
    console.error("ERROR CREATING EVENT:", err);
  }
  process.exit(0);
})();
