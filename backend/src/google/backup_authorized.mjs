import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import readline from "readline";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const {
  GOOGLE_OAUTH_CREDENTIALS = "src/google/credentials.json",
  GOOGLE_OAUTH_TOKEN_FILE = "src/google/token.json",
} = process.env;

async function loadCredentials() {
  const p = path.resolve(GOOGLE_OAUTH_CREDENTIALS);
  if (!fsSync.existsSync(p)) throw new Error(`Credentials file not found: ${p}`);
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw);
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (ans) => { rl.close(); res(ans); }));
}

(async () => {
  try {
    const creds = await loadCredentials();
    const c = creds.installed ?? creds.web ?? creds;
    if (!c || !c.client_id || !c.client_secret) {
      throw new Error("Invalid OAuth credentials file format");
    }

    const oauth2Client = new google.auth.OAuth2(c.client_id, c.client_secret, c.redirect_uris?.[0] ?? "urn:ietf:wg:oauth:2.0:oob");

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive.file"],
      prompt: "consent",
    });

    console.log("Open this URL in your browser and allow access:\n\n", authUrl, "\n");
    const code = await ask("Paste the code from the page here: ");

    const { tokens } = await oauth2Client.getToken(code.trim());
    oauth2Client.setCredentials(tokens);

    const tokenPath = path.resolve(GOOGLE_OAUTH_TOKEN_FILE);
    await fs.mkdir(path.dirname(tokenPath), { recursive: true });
    await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2), "utf8");
    console.log("Token saved to", tokenPath);
    console.log("Now restart your backend (nodemon) and backups will run.");
  } catch (err) {
    console.error("Authorization failed:", err?.message || err);
    process.exit(1);
  }
})();
