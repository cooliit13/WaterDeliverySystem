// src/utils/apiFetch.js
export async function apiFetch(path, opts = {}) {
  // backend base: prefer VITE_BACKEND_URL, fallback to VITE_API_BASE (some of your code uses VITE_API_BASE)
  const BACKEND = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE || "";
  const url = `${BACKEND}${path}`;

  // Token fallback keys (make tolerant to different key names used across your app)
  const token = localStorage.getItem("token") 
    || localStorage.getItem("authToken") 
    || localStorage.getItem("jwt");

  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  // Only attach Authorization header if token exists and caller didn't explicitly opt out
  if (token && opts.auth !== false) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    headers,
    credentials: opts.credentials ?? "include", // keep cookies if backend uses them
    ...opts,
  });

  const ct = res.headers.get("content-type") || "";

  // Helpful error if server returned HTML (index.html / error page)
  if (ct.includes("text/html")) {
    const text = await res.text();
    throw new Error(
      `Expected JSON but received HTML. status=${res.status} url=${url} preview=${text.slice(0, 300)}`
    );
  }

  // If unauthorized, throw a clear error so UI can redirect to login
  if (res.status === 401) {
    // try to parse JSON error if available
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      // ignore
    }
    throw new Error(body?.message || "Unauthorized (401). Please login again.");
  }

  // JSON path
  if (ct.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `Request failed: ${res.status}`);
    return data;
  }

  // fallback to text
  const text = await res.text();
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
