import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/order.js";

dotenv.config();


async function ensureFetch() {
  if (typeof fetch === "undefined") {
    try {
      const mod = await import("node-fetch");
      globalThis.fetch = mod.default ?? mod;
      console.log("✅ polyfilled fetch with node-fetch");
    } catch (err) {
      console.warn(
        "⚠️ fetch is not available and node-fetch could not be imported. Install node-fetch or run on Node 18+.",
        err.message
      );
    }
  } else {
    // fetch exists
  }
}

// Improved geocode helper (cleans addresses and tries several candidate queries)
async function geocodeAddress(address) {
  if (!address) return null;

  // CLEAN: remove Phone/Notes lines and convert multiline to comma-separated
  let cleaned = address
    .replace(/Phone:[\s\S]*$/i, "") // drop 'Phone:' and following
    .replace(/Notes?:[\s\S]*$/i, "") // drop 'Notes:' and following
    .replace(/\r\n|\r|\n/g, ", ")
    .replace(/\s+,/g, ",")
    .replace(/,+/g, ",")
    .trim();

  cleaned = cleaned.replace(/^[,\s]+|[,\s]+$/g, "");

  // Build candidates to try (in order)
  const candidates = [];
  if (cleaned) candidates.push(cleaned);
  if (cleaned && !/philippines/i.test(cleaned)) candidates.push(`${cleaned}, Philippines`);
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    candidates.push(parts.slice(0, 2).join(", "));
    candidates.push(parts.slice(0, 2).join(", ") + ", Philippines");
  }
  const pincodeMatch = address.match(/\b\d{4,6}\b/);
  const cityMatch = parts.length >= 2 ? parts[1] : null;
  if (cityMatch || pincodeMatch) {
    let cityPin = "";
    if (cityMatch) cityPin += cityMatch;
    if (pincodeMatch) cityPin += (cityPin ? ", " : "") + pincodeMatch[0];
    if (cityPin) {
      candidates.push(cityPin);
      candidates.push(cityPin + ", Philippines");
    }
  }

  const uniq = [...new Set(candidates.filter(Boolean))];

  for (const q of uniq) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "WaterDeliverySystem/1.0 (student@example.com)",
        },
      });

      if (!res.ok) {
        console.error("❌ Geocode fetch failed:", res.status, await res.text());
        // try next candidate
        continue;
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon } = data[0];
        console.log(`   🔎 Geocode match for "${q}" -> ${lat},${lon}`);
        return { lat: Number(lat), lng: Number(lon) };
      } else {
        console.log(`   (no match) tried query: "${q}"`);
      }
    } catch (err) {
      console.error("🌍 Geocode request error for", q, err.message || err);
    }

    // politeness pause between candidate queries
    await new Promise((r) => setTimeout(r, 200));
  }

  // no candidates matched
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  try {
    console.log("🚀 Running backfillGeocodeOrders script...");
    await ensureFetch();

    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      console.error("❌ Missing MONGO_URI in .env — please add it and re-run.");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI, {
      // optional: useNewUrlParser, useUnifiedTopology not needed on recent mongoose
    });
    console.log("✅ Connected to MongoDB");

    // find orders missing deliveryLocation (either field absent or null)
    const orders = await Order.find({
      $or: [{ deliveryLocation: { $exists: false } }, { deliveryLocation: null }],
    });

    console.log(`📦 Found ${orders.length} orders missing coordinates.`);

    let processed = 0;
    for (const order of orders) {
      console.log(`➡️  Processing: ${order._id}`);
      const addr = order.deliveryAddress || "";
      if (!addr) {
        console.log("   ⚠️  No deliveryAddress present; skipping");
        processed++;
        continue;
      }

      const coords = await geocodeAddress(addr);

      if (coords) {
        order.deliveryLocation = coords;
        try {
          await order.save();
          console.log(`   ✅ Saved coords: ${coords.lat}, ${coords.lng}`);
        } catch (saveErr) {
          console.error("   ❌ Error saving coords to DB:", saveErr.message || saveErr);
        }
      } else {
        console.log("   ⚠️  Skipped (no coordinates found)");
      }

      processed++;
      // politeness delay between orders
      await sleep(250);
    }

    console.log(`🎉 Backfill complete! Processed ${processed} orders.`);
  } catch (err) {
    console.error("Fatal error in backfill script:", err);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
    process.exit(0);
  }
}

main();
