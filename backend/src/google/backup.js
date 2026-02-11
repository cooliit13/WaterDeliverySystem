import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { google } from "googleapis";
import dotenv from "dotenv";
import Order from "../models/order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

dotenv.config();

const {
  GOOGLE_OAUTH_CREDENTIALS = "src/google/credentials.json",
  GOOGLE_OAUTH_TOKEN_FILE = "src/google/token.json",
  GOOGLE_DRIVE_FOLDER_ID,
  GDRIVE_BACKUP_INTERVAL_MS = "604800000",
  BACKUP_ENCRYPTION_KEY,           // hex or base64 key (32 bytes)
  BACKUP_ENCRYPTION_ENABLED = "true"
} = process.env;

const intervalMs = Number(GDRIVE_BACKUP_INTERVAL_MS || 0);

if (!globalThis.__gdriveBackup) {
  globalThis.__gdriveBackup = { started: false, timer: null };
}


const ENC_ENABLED = Boolean(BACKUP_ENCRYPTION_KEY && String(BACKUP_ENCRYPTION_ENABLED).toLowerCase() !== "false");

function getKeyBuffer() {
  if (!BACKUP_ENCRYPTION_KEY) return null;
  const key = BACKUP_ENCRYPTION_KEY.trim();

  // Try hex first (64 hex chars => 32 bytes)
  try {
    if (/^[0-9a-fA-F]{64}$/.test(key)) {
      return Buffer.from(key, "hex");
    }
  } catch (e) { /* fallthrough */ }

  // Try base64
  try {
    const buf = Buffer.from(key, "base64");
    if (buf.length === 32) return buf;
  } catch (e) { /* fallthrough */ }

  // Last attempt: raw utf-8 -> derive/pad (not ideal) — we will not accept this silently
  throw new Error("BACKUP_ENCRYPTION_KEY must be a 32-byte key encoded as hex (64 chars) or base64 (32 bytes).");
}

const IV_LENGTH = 16; // AES block size

function encryptString(plain) {
  const keyBuf = getKeyBuffer();
  if (!keyBuf) throw new Error("Encryption key not found");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", keyBuf, iv);
  let encrypted = cipher.update(plain, "utf8", "base64");
  encrypted += cipher.final("base64");
  return { iv: iv.toString("base64"), data: encrypted };
}

function decryptToString(encObj) {
  const keyBuf = getKeyBuffer();
  if (!keyBuf) throw new Error("Encryption key not found");
  const iv = Buffer.from(encObj.iv, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuf, iv);
  let decrypted = decipher.update(encObj.data, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}


async function loadCredentials() {
  const credPath = path.resolve(GOOGLE_OAUTH_CREDENTIALS);
  if (!fsSync.existsSync(credPath)) throw new Error(`OAuth credentials not found: ${credPath}`);
  const raw = await fs.readFile(credPath, "utf8");
  return JSON.parse(raw);
}

async function loadToken() {
  try {
    const tokenPath = path.resolve(GOOGLE_OAUTH_TOKEN_FILE);
    if (!fsSync.existsSync(tokenPath)) return null;
    const raw = await fs.readFile(tokenPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

async function saveToken(token) {
  const tokenPath = path.resolve(GOOGLE_OAUTH_TOKEN_FILE);
  await fs.mkdir(path.dirname(tokenPath), { recursive: true });
  await fs.writeFile(tokenPath, JSON.stringify(token, null, 2), "utf8");
  console.log("[GDrive Backup] Saved token to", tokenPath);
}


async function createOAuthClient() {
  const creds = await loadCredentials();
  const c = creds.installed ?? creds.web ?? creds;
  if (!c || !c.client_id || !c.client_secret) {
    throw new Error("Invalid OAuth credentials file format");
  }
  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
    c.client_id,
    c.client_secret,
    c.redirect_uris?.[0] ?? "urn:ietf:wg:oauth:2.0:oob"
  );

  const token = await loadToken();
  if (token) {
    oauth2Client.setCredentials(token);
  } else {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive.file"],
      prompt: "consent",
    });
    console.warn("[GDrive Backup] No OAuth token found. Please run the authorization helper to generate one:");
    console.warn("  node src/google/backup_authorize.mjs");
    console.warn("Or open this URL in a browser and follow instructions:\n", authUrl);
  }

  return oauth2Client;
}


async function createDriveClient() {
  const oauth2Client = await createOAuthClient();
  const drive = google.drive({ version: "v3", auth: oauth2Client });
  return { drive, oauth2Client };
}

/** Build backup JSON payload */
async function buildBackupPayload() {
  const orders = await Order.find({}).lean().exec();
  const products = await Product.find({}).lean().exec();
  const users = await User.find({}).lean().select("-password -salt").exec();
  const meta = {
    generatedAt: new Date().toISOString(),
    counts: { orders: orders.length, products: products.length, users: users.length },
  };
  return { meta, orders, products, users };
}

/** Save JSON (or encrypted) to local temp file (system temp dir) */
async function writeTempFile(payload, { encrypted = false } = {}) {
  const tmpDir = path.join(os.tmpdir(), "water-delivery-backups");
  await fs.mkdir(tmpDir, { recursive: true });

  if (encrypted) {
    const name = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.enc`;
    const filePath = path.join(tmpDir, name);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
    console.log("[GDrive Backup] Encrypted temp file written:", filePath);
    return { filePath, fileName: name };
  } else {
    const name = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const filePath = path.join(tmpDir, name);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
    console.log("[GDrive Backup] Temp file written:", filePath);
    return { filePath, fileName: name };
  }
}

/** Upload to Drive (uses OAuth user account). If GOOGLE_DRIVE_FOLDER_ID set, upload into that folder. */
async function uploadToDrive(filePath, fileName) {
  const { drive } = await createDriveClient();
  const media = {
    mimeType: "application/octet-stream",
    body: fsSync.createReadStream(filePath),
  };

  const requestBody = { name: fileName };
  if (GOOGLE_DRIVE_FOLDER_ID) requestBody.parents = [GOOGLE_DRIVE_FOLDER_ID];

  const res = await drive.files.create({
    requestBody,
    media,
    fields: "id, name, parents",
  });

  return res.data;
}

async function removeLocal(filePath) {
  try { await fs.unlink(filePath); } catch (e) {}
}

/** Run one backup now */
export async function runBackupNow({ keepLocal = false } = {}) {
  console.log("[GDrive Backup] Starting backup...");
  try {
    const payload = await buildBackupPayload();

    let filePath, fileName;
    if (ENC_ENABLED) {
      // encrypt the JSON payload
      const enc = encryptString(JSON.stringify(payload));
      // write the encrypted object as JSON to disk (.enc)
      ({ filePath, fileName } = await writeTempFile(enc, { encrypted: true }));
    } else {
      ({ filePath, fileName } = await writeTempFile(payload, { encrypted: false }));
    }

    const uploaded = await uploadToDrive(filePath, fileName);
    if (!keepLocal) await removeLocal(filePath);
    console.log("[GDrive Backup] Backup successful:", uploaded?.name || fileName, "id:", uploaded?.id);
    return { success: true, file: uploaded };
  } catch (err) {
    console.error("[GDrive Backup] Backup failed:", err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}

/** Start automatic backup (interval in ms from env) */
export function startAutoBackup() {
  // Global guard to prevent double-scheduling across duplicate imports
  if (globalThis.__gdriveBackup.started) {
    console.log("[GDrive Backup] startAutoBackup called but backup already started — skipping.");
    return;
  }

  if (!intervalMs || intervalMs <= 0) {
    console.warn("[GDrive Backup] Auto backup disabled (interval not set).");
    return;
  }

  // If encryption is enabled, validate key early so failures are obvious
  if (ENC_ENABLED) {
    try {
      getKeyBuffer(); // throws if invalid
    } catch (e) {
      console.error("[GDrive Backup] Invalid encryption key:", e.message);
      return;
    }
  }

  // mark started and store timer globally so stopAutoBackup works reliably
  globalThis.__gdriveBackup.started = true;

  // run first immediately, then schedule
  runBackupNow().catch(() => {});
  globalThis.__gdriveBackup.timer = setInterval(() => {
    runBackupNow().catch(() => {});
  }, intervalMs);

  console.log(`[GDrive Backup] Auto backup scheduled every ${intervalMs} ms`);
}

export function stopAutoBackup() {
  if (globalThis.__gdriveBackup.timer) {
    clearInterval(globalThis.__gdriveBackup.timer);
    globalThis.__gdriveBackup.timer = null;
  }
  globalThis.__gdriveBackup.started = false;
}

export default { runBackupNow, startAutoBackup, stopAutoBackup, saveToken, encryptString, decryptToString };
