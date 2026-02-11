import { google } from "googleapis";
import dotenv from "dotenv";
import User from "../models/User.js";
dotenv.config();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_CALENDAR_REFRESH_TOKEN, 
  GOOGLE_CALENDAR_ID, 
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  throw new Error("Missing Google OAuth environment variables.");
}

/** Create a fresh OAuth2 client */
export function createOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/** Generate Google OAuth consent URL */
export function generateAuthUrl({
  scopes = ["https://www.googleapis.com/auth/calendar.events"],
  access_type = "offline",
  prompt = "consent",
} = {}) {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type,
    prompt,
    scope: scopes,
  });
}

/** Exchange an authorization code for tokens */
export async function getTokensFromCode(code) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}


export function getCalendarClientForUser(user) {
  if (!user?.googleTokens) throw new Error("User has no stored Google tokens.");

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials(user.googleTokens);

  // Auto-refresh listener — updates tokens in DB
  oauth2Client.on("tokens", async (newTokens) => {
    try {
      console.log(`🔄 Tokens refreshed for user ${user._id}`);
      const updatedTokens = {
        ...user.googleTokens,
        ...newTokens,
      };
      await User.findByIdAndUpdate(user._id, { googleTokens: updatedTokens });
    } catch (err) {
      console.error("Error saving refreshed tokens:", err);
    }
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  return { calendar, oauth2Client };
}



// create an OAuth client for app-level usage
const appOAuthClient = createOAuthClient();


if (GOOGLE_CALENDAR_REFRESH_TOKEN) {
  appOAuthClient.setCredentials({
    refresh_token: GOOGLE_CALENDAR_REFRESH_TOKEN,
  });

  // Listen for token refresh and log (you may persist if you want)
  appOAuthClient.on("tokens", (tokens) => {
    if (tokens.refresh_token) {
      // usually refresh_token is only returned on first auth flow; we keep env-based token
      console.log("App OAuth client refreshed a refresh_token (ignore or persist):", Boolean(tokens.refresh_token));
    }
    if (tokens.access_token) {
      console.log("App OAuth client got new access token.");
    }
  });
} else {
  console.warn("GOOGLE_CALENDAR_REFRESH_TOKEN is not set — app-level calendar calls will fail until provided.");
}

export const appCalendar = google.calendar({ version: "v3", auth: appOAuthClient });

export async function createEventForOrder(order) {
  if (!order) throw new Error("createEventForOrder: order required");
  if (!GOOGLE_CALENDAR_REFRESH_TOKEN) {
    console.warn("createEventForOrder: GOOGLE_CALENDAR_REFRESH_TOKEN not configured — skipping.");
    return null;
  }

  // Choose calendar id
  const calendarId = GOOGLE_CALENDAR_ID || "primary";

  // Determine delivery time/date
  const deliveryRaw = order.deliveryDate || order.deliveryAt || order.deliveryDatetime || order.date;
  if (!deliveryRaw) {
    console.warn("createEventForOrder: order has no delivery date — skipping.");
    return null;
  }

  // Try to parse as full datetime
  let startDate = new Date(deliveryRaw);
  let isAllDay = false;
  if (Number.isNaN(startDate.getTime())) {
    // try parsing yyyy-mm-dd (no time) => create all-day event
    const parts = String(deliveryRaw || "").split("-").map((p) => p.trim());
    if (parts.length === 3) {
      const iso = `${parts[0].padStart(4, "0")}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      isAllDay = true;
      // for all-day, Google expects 'date' fields (YYYY-MM-DD)
      const eventAllDay = {
        summary: `Delivery — ${order.customer?.name || order.customerName || "Customer"}`,
        description: [
          `Order ID: ${order._id || order.id || ""}`,
          `Items: ${
            Array.isArray(order.items)
              ? order.items.map((i) => `${i.name || i.productName || i.productId} x${i.qty ?? i.quantity ?? 1}`).join(", ")
              : ""
          }`,
          `Notes: ${order.note || order.remarks || ""}`,
        ].filter(Boolean).join("\n"),
        start: { date: iso },
        end: { date: iso },
        location: order.deliveryAddress || "",
      };

      const res = await appCalendar.events.insert({
        calendarId,
        requestBody: eventAllDay,
      });
      return res.data;
    } else {
      // Couldn't parse date — skip
      console.warn("createEventForOrder: Could not parse delivery date:", deliveryRaw);
      return null;
    }
  }

  // If we have a Date object
  // Default time if none: 09:00 local
  if (startDate.getHours() === 0 && startDate.getMinutes() === 0 && !order.deliveryTime) {
    startDate.setHours(9, 0, 0, 0);
  }

  const durationMinutes = Number(order.deliveryDurationMinutes ?? 30);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const title = `Delivery — ${order.customer?.name || order.customerName || "Customer"}`;
  const description = [
    `Order ID: ${order._id || order.id || ""}`,
    `Items: ${
      Array.isArray(order.items)
        ? order.items.map((i) => `${i.name || i.productName || i.productId} x${i.qty ?? i.quantity ?? 1}`).join(", ")
        : ""
    }`,
    `Notes: ${order.note || order.remarks || ""}`,
  ].filter(Boolean).join("\n");

  const event = {
    summary: title,
    description,
    start: { dateTime: startDate.toISOString() },
    end: { dateTime: endDate.toISOString() },
    location: order.deliveryAddress || "",
  };

    try {
    const res = await appCalendar.events.insert({
      calendarId,
      requestBody: event,
    });
    return res.data;
  } catch (err) {
    // Improve logging so we can see when the refresh token is invalid
    const message = err?.message || String(err);
    console.error("createEventForOrder: calendar API error:", message);

    // If Google returned an OAuth error (invalid_grant) warn with actionable message
    const errCode = err?.response?.data?.error;
    const errDesc = err?.response?.data?.error_description;
    if (errCode === "invalid_grant" || (message && message.includes("invalid_grant"))) {
      console.error("createEventForOrder: OAuth issue detected (invalid_grant). This means the refresh token used by the app has been revoked or expired.");
      console.error("-> Re-authorize the Google account to obtain a new refresh token and update GOOGLE_CALENDAR_REFRESH_TOKEN in your .env.");
    } else {
      console.error("createEventForOrder: calendar insertion failed - see error details above.");
    }

    // Re-throw so callers that rely on thrown errors still receive it OR return null if you want non-fatal:
    throw err;
  }
}
