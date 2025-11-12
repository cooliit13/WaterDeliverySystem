import express from "express";
import {
  generateAuthUrl,
  getTokensFromCode,
  getCalendarClientForUser,
} from "../utils/googleCalendar.js";
import User from "../models/User.js";
import { getBookedDeliveryDates } from "../controllers/orderController.js"; // ✅ added

const router = express.Router();

// STEP 1: Redirect user to Google consent
router.get("/auth", (req, res) => {
  const url = generateAuthUrl({
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    access_type: "offline",
    prompt: "consent",
  });
  res.redirect(url);
});

// STEP 2: Handle callback and store tokens
router.get("/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const tokens = await getTokensFromCode(code);
    const userId = req.user?._id || "demoUser";

    await User.findByIdAndUpdate(
      userId,
      { googleTokens: tokens },
      { upsert: true, new: true }
    );

    res.send("✅ Google Calendar connected successfully!");
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).send("Failed to connect Google Calendar");
  }
});

// STEP 3: Example route that uses stored tokens (auto-refresh supported)
router.get("/events", async (req, res) => {
  try {
    const userId = req.user?._id || "demoUser";
    const user = await User.findById(userId);
    if (!user?.googleTokens)
      return res.status(401).send("User has not connected Google Calendar");

    const { calendar } = getCalendarClientForUser(user);

    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 10,
    });

    res.json(eventsRes.data.items);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).send("Error fetching events");
  }
});

// ✅ STEP 4: Get all booked delivery dates
router.get("/booked-dates", getBookedDeliveryDates);

export default router;
