// backend/src/utils/geocode.js
// Server-side geocoding util. Uses GEOAPIFY_KEY env var if present, otherwise falls back to Nominatim.
import dotenv from "dotenv";
dotenv.config();

const GEOAPIFY_KEY = process.env.GEOAPIFY_KEY || process.env.VITE_GEOAPIFY_KEY || "";

export async function geocodeAddress(address) {
  if (!address) return null;

  // prefer Geoapify when key is available (more accurate)
  if (GEOAPIFY_KEY) {
    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
        address
      )}&limit=1&apiKey=${encodeURIComponent(GEOAPIFY_KEY)}`;

      const res = await fetch(url, {
        headers: { "User-Agent": "WaterDeliverySystem/1.0 (server)" },
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json && Array.isArray(json.features) && json.features.length > 0) {
          const [f] = json.features;
          const lon = f?.geometry?.coordinates?.[0];
          const lat = f?.geometry?.coordinates?.[1];
          if (typeof lat === "number" && typeof lon === "number") {
            return { lat: Number(lat), lng: Number(lon) };
          }
        }
      } else {
        const txt = await res.text().catch(() => "");
        console.warn("Geoapify geocode failed:", res.status, txt.slice(0, 200));
      }
    } catch (err) {
      console.error("Geoapify geocode error:", err);
    }
  }

  // Fallback: Nominatim (OpenStreetMap)
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "WaterDeliverySystem/1.0 (server@example.com)",
      },
    });

    if (!res.ok) {
      console.warn("Nominatim geocode failed:", res.status);
      return null;
    }

    const data = await res.json().catch(() => null);
    if (Array.isArray(data) && data.length > 0) {
      const { lat, lon } = data[0];
      return { lat: Number(lat), lng: Number(lon) };
    }
  } catch (err) {
    console.error("Nominatim geocode error:", err);
  }

  return null;
}

export default { geocodeAddress };
