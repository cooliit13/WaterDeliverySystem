// tools/get_new_google_refresh_token.mjs
// Run this from the "backend" folder:
//   node tools/get_new_google_refresh_token.mjs

import readline from "readline";
// NOTE: correct relative path from backend/tools -> backend/src/utils/googleCalendar.js
import { generateAuthUrl, getTokensFromCode } from "../src/utils/googleCalendar.js";

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (ans) => { rl.close(); res(ans); }));
}

(async () => {
  try {
    const oauthUrl = generateAuthUrl();
    console.log("\nOpen this URL in your browser (login with the Google account used for the calendar):\n");
    console.log(oauthUrl);
    console.log("\nAfter allowing access, Google will redirect to your redirect URI with a `code` parameter.");
    console.log("Copy the `code` value from the redirect URL and paste it below.\n");

    const code = await prompt("Paste the `code` here: ");
    if (!code) {
      console.error("No code provided — exiting.");
      process.exit(1);
    }

    const tokens = await getTokensFromCode(code.trim());
    console.log("\n--- TOKENS ---\n", JSON.stringify(tokens, null, 2));
    console.log("\nIf `refresh_token` is present, copy it and set it in your .env:");
    console.log("GOOGLE_CALENDAR_REFRESH_TOKEN=your_new_refresh_token_here\n");
    process.exit(0);
  } catch (err) {
    // show helpful diagnostics
    console.error("Failed to exchange code for tokens:");
    if (err?.response?.data) {
      console.error(err.response.data);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
})();
