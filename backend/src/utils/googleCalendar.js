// utils/googleCalendar.js
import { google } from 'googleapis';
import dotenv from 'dotenv';
import User from '../models/User.js';
dotenv.config();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  throw new Error('Missing Google OAuth environment variables.');
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
  scopes = ['https://www.googleapis.com/auth/calendar.events'],
  access_type = 'offline',
  prompt = 'consent'
} = {}) {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type,
    prompt,
    scope: scopes
  });
}

/** Exchange an authorization code for tokens */
export async function getTokensFromCode(code) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Get a calendar client tied to a user.
 * Automatically refreshes and persists new tokens.
 */
export function getCalendarClientForUser(user) {
  if (!user?.googleTokens) throw new Error('User has no stored Google tokens.');

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials(user.googleTokens);

  // Auto-refresh listener — updates tokens in DB
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      console.log(`🔄 Tokens refreshed for user ${user._id}`);
      const updatedTokens = {
        ...user.googleTokens,
        ...newTokens
      };
      await User.findByIdAndUpdate(user._id, { googleTokens: updatedTokens });
    } catch (err) {
      console.error('Error saving refreshed tokens:', err);
    }
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  return { calendar, oauth2Client };
}

// ✅ ADD THIS: default calendar client (for app-level use, e.g. in orderController)
const appOAuthClient = createOAuthClient();
export const calendar = google.calendar({ version: 'v3', auth: appOAuthClient });
