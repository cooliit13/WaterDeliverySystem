// frontend/src/utils/geocode.js
// Client-side geocode util for browser. Uses Vite env var VITE_GEOAPIFY_KEY if present,
// otherwise falls back to Nominatim. DOES NOT reference `process` so it works in the browser.

const GEOAPIFY_KEY =
  // Vite exposes env as import.meta.env.VITE_*
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEOAPIFY_KEY) ||
  // fallback: window global (if you want to set it manually)
  (typeof window !== "undefined" && window.__GEOAPIFY_KEY__) ||
  "";

/**
 * geocodeAddress (browser)
 * returns { lat, lng } or null
 */
export async function geocodeAddress(address) {
  if (!address) return null;

  // prefer Geoapify if key present
  if (GEOAPIFY_KEY) {
    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
        address
      )}&limit=1&apiKey=${encodeURIComponent(GEOAPIFY_KEY)}`;

      const res = await fetch(url);
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
        // don't spam console on normal 4xx errors, but log if unexpected
        console.warn("Geoapify geocode failed (client):", res.status);
      }
    } catch (err) {
      console.warn("Geoapify client geocode error:", err);
    }
  }

  // Fallback: Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}&limit=1`;
    const res = await fetch(url, {
      headers: {
        // Be polite - identify application; no email required but helpful
        "User-Agent": "WaterDeliverySystem/1.0 (frontend)",
      },
    });

    if (!res.ok) {
      console.warn("Nominatim geocode failed (client):", res.status);
      return null;
    }

    const data = await res.json().catch(() => null);
    if (Array.isArray(data) && data.length > 0) {
      const { lat, lon } = data[0];
      return { lat: Number(lat), lng: Number(lon) };
    }
  } catch (err) {
    console.error("Nominatim client geocode error:", err);
  }

  return null;
}

export default { geocodeAddress };
