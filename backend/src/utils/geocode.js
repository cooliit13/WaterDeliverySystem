// backend/src/utils/geocode.js
// Minimal geocode helper using OpenStreetMap Nominatim
// No API key required. Respect Nominatim usage policy (don't flood it).

// If your Node version < 18, install node-fetch and uncomment the import below:
// import fetch from "node-fetch";

export async function geocodeAddress(address) {
  if (!address) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    address
  )}&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        // Be polite - identify your application (replace email with yours)
        "User-Agent": "WaterDeliverySystem/1.0 (student@example.com)",
      },
    });

    if (!res.ok) {
      console.error("Geocode request failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const { lat, lon } = data[0];
      return { lat: Number(lat), lng: Number(lon) };
    }
    return null;
  } catch (err) {
    console.error("Geocode error:", err);
    return null;
  }
}
