import { google } from "googleapis";
import path from "path";
import fs from "fs";

const TOKEN_PATH = path.join(process.cwd(), "google/token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "google/credentials.json");

export function loadSavedCredentialsIfExist() {
  try {
    const content = fs.readFileSync(TOKEN_PATH, "utf8");
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

export async function saveCredentials(client) {
  const content = fs.readFileSync(CREDENTIALS_PATH, "utf8");
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;

  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });

  fs.writeFileSync(TOKEN_PATH, payload);
}

export async function authorize() {
  const client = loadSavedCredentialsIfExist();
  if (client) return client;

  const content = fs.readFileSync(CREDENTIALS_PATH, "utf8");
  const keys = JSON.parse(content);
  const { client_id, client_secret, redirect_uris } = keys.installed;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });

  console.log("Authorize this app by visiting:\n", authUrl);

  console.log("\nAfter allowing access, Google will redirect with ?code=YOUR_CODE");
  console.log("Run: node google/save_token.js ?code=YOUR_CODE\n");

  return oAuth2Client;
}
