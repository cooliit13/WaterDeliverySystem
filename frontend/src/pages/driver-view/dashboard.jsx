// frontend/src/pages/driver-view/dashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bell, CheckCircle, XCircle, LogOut, Camera } from "lucide-react";

function DriverDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [notification, setNotification] = useState("");
  const navigate = useNavigate();

  const [coordsMap, setCoordsMap] = useState({});

  // file input ref & state for proof upload flow
  const fileInputRef = useRef(null);
  const currentOrderRef = useRef(null);
  const pendingDeliverRef = useRef(false);

  const activeControllerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const controller = new AbortController();
    activeControllerRef.current = controller;

    (async () => {
      await fetchDriverOrders({ signal: controller.signal });
    })().catch((e) => {
      if (e.name === "AbortError") return;
      console.error("fetchDriverOrders error (unexpected):", e);
    });

    return () => {
      try {
        controller.abort();
      } catch (e) {}
      activeControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDriverOrders = async ({ signal } = {}) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setDeliveries([]);
        setNotification("");
        return;
      }

      let createdController = null;
      if (!signal) {
        createdController = new AbortController();
        signal = createdController.signal;
        activeControllerRef.current = createdController;
      }

      const res = await fetch("http://localhost:5000/api/driver/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal,
      });

      if (createdController) {
        activeControllerRef.current = null;
      }

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        try {
          window.dispatchEvent(new Event("authChanged"));
        } catch (e) {}
        navigate("/auth/login", { replace: true });
        return;
      }

      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const err = await res.json().catch(() => ({}));
          console.error("Failed to fetch driver orders (json):", err);
        } else {
          const text = await res.text().catch(() => "");
          console.error("Failed to fetch driver orders (text/html):", text.slice(0, 200));
        }
        return;
      }

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text().catch(() => "");
        console.error("Expected JSON from /api/driver/orders but got:", text.slice(0, 200));
        return;
      }

      const payload = await res.json();
      // order array may be returned directly or in payload.orders
      const orders = Array.isArray(payload) ? payload : payload.orders ?? payload.data ?? [];
      setDeliveries(orders);
      setNotification(orders.length > 0 ? "New delivery assigned!" : "");
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
      console.log("Error fetching driver orders:", error);
    }
  };

  // geocode helper (client-side fallback) using Nominatim (free)
  const geocodeText = async (text) => {
    if (!text) return null;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        text
      )}&limit=1`;
      const r = await fetch(url, {
        headers: {
          "User-Agent": "WaterDeliverySystem/1.0 (student@example.com)",
        },
      });
      if (!r.ok) return null;
      const data = await r.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon } = data[0];
        return { lat: Number(lat), lng: Number(lon) };
      }
    } catch (err) {
      console.error("geocodeText error:", err);
    }
    return null;
  };

  // Try to populate coordsMap from existing data on load
  useEffect(() => {
    if (!deliveries || deliveries.length === 0) return;

    setCoordsMap((prev) => {
      const next = { ...prev };
      deliveries.forEach((d) => {
        const address = d.deliveryAddress || d.address || "";
        if (d.deliveryLocation && d.deliveryLocation.lat && d.deliveryLocation.lng) {
          next[address] = {
            lat: d.deliveryLocation.lat,
            lng: d.deliveryLocation.lng,
          };
        }
      });
      return next;
    });

    // attempt to geocode addresses that lack coordinates (stagger to be polite)
    deliveries.forEach((d, idx) => {
      const address = d.deliveryAddress || d.address || "";
      if (!address) return;
      const dbCoords =
        d.deliveryLocation && d.deliveryLocation.lat && d.deliveryLocation.lng;
      const hasCoords = dbCoords || coordsMap[address];
      if (!hasCoords) {
        // stagger requests to avoid hammering the free service
        setTimeout(() => {
          (async () => {
            const cleaned = cleanAddressString(address);
            const coords = await geocodeText(cleaned);
            if (coords) {
              setCoordsMap((prev) => ({ ...prev, [address]: coords }));
            }
          })();
        }, idx * 300);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveries]);

  // helper cleans up the address text block (remove Phone:, Notes:, newlines)
  const cleanAddressString = (raw) => {
    if (!raw) return "";
    let s = String(raw);
    s = s.replace(/Phone:\s*[^,;]*/gi, "");
    s = s.replace(/Notes:\s*.*$/gim, "");
    s = s.replace(/\r/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    return s;
  };

  // openLocation: prefer precise coords, fallback to geocoding, fallback to cleaned address
  const openLocation = async (order) => {
    if (!order) return alert("No order data");

    // 1) DB coords
    const dbCoords = order.deliveryLocation;
    if (dbCoords && dbCoords.lat && dbCoords.lng) {
      const lat = Number(dbCoords.lat);
      const lng = Number(dbCoords.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
        return;
      }
    }

    // 2) coordsMap (from earlier geocode attempts)
    const addr = order.deliveryAddress || order.address || "";
    const cached = coordsMap[addr];
    if (cached && cached.lat && cached.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${cached.lat},${cached.lng}`);
      return;
    }

    // 3) cleaned address + geocode
    const cleaned = cleanAddressString(order.deliveryAddress || order.address || "");
    if (cleaned) {
      const coords = await geocodeText(cleaned);
      if (coords && coords.lat && coords.lng) {
        // cache it for later
        setCoordsMap((prev) => ({ ...prev, [addr]: coords }));
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`);
        return;
      }
    }

    // 4) final fallback: open maps with cleaned address text
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cleaned || addr)}`);
  };

  // keep existing status update (for on the way / cancel)
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth/login");
        return;
      }

      // For non-completed statuses we reuse existing endpoint
      if (newStatus !== "completed") {
        const res = await fetch(`http://localhost:5000/api/driver/orders/${orderId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          try { window.dispatchEvent(new Event("authChanged")); } catch (e) {}
          navigate("/auth/login", { replace: true });
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error("Status update failed:", body);
          return;
        }
        await fetchDriverOrders();
        return;
      }

      // If newStatus === 'completed' we expect the delivered flow to be handled by handleDeliverClick
      console.warn("Use the delivered button flow that includes proof upload.");
    } catch (error) {
      console.log("Status update error:", error);
    }
  };

  // ---------- Delivered -> pick image -> upload proof -> mark delivered ----------
  const handleDeliverClick = (orderId) => {
    currentOrderRef.current = orderId;
    pendingDeliverRef.current = true;
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // upload the file and then mark delivered
  const uploadProofAndMarkDelivered = async (orderId, file) => {
    if (!orderId || !file) return;
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth/login");
      return;
    }

    try {
      // 1) Upload proof to backend (backend should upload to Cloudinary)
      const fd = new FormData();
      fd.append("proof", file);

      const uploadRes = await fetch(`http://localhost:5000/api/driver/orders/${orderId}/proof`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (uploadRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        try { window.dispatchEvent(new Event("authChanged")); } catch (e) {}
        navigate("/auth/login", { replace: true });
        return;
      }

      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        console.error("Upload proof failed:", body);
        return;
      }

      // 2) Mark order as delivered (call deliver endpoint)
      const deliverRes = await fetch(`http://localhost:5000/api/driver/orders/${orderId}/deliver`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}), // backend will compute remaining items if no items provided
      });

      if (deliverRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        try { window.dispatchEvent(new Event("authChanged")); } catch (e) {}
        navigate("/auth/login", { replace: true });
        return;
      }

      if (!deliverRes.ok) {
        const body = await deliverRes.json().catch(() => ({}));
        console.error("Mark delivered failed:", body);
        return;
      }

      // refresh list
      await fetchDriverOrders();
      console.log("Proof uploaded and order marked delivered");
    } catch (err) {
      console.error("uploadProofAndMarkDelivered error:", err);
    } finally {
      pendingDeliverRef.current = false;
      currentOrderRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // file input onChange
  const onFileChange = (e) => {
    const file = e?.target?.files?.[0] ?? null;
    const orderId = currentOrderRef.current;
    if (!file || !orderId) {
      pendingDeliverRef.current = false;
      currentOrderRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (pendingDeliverRef.current) {
      uploadProofAndMarkDelivered(orderId, file);
      return;
    }

    currentOrderRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenFile = (orderId) => {
    currentOrderRef.current = orderId;
    pendingDeliverRef.current = false;
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (activeControllerRef.current) {
      try {
        activeControllerRef.current.abort();
      } catch (e) {}
      activeControllerRef.current = null;
    }

    setDeliveries([]);
    setNotification("");

    try {
      window.dispatchEvent(new Event("authChanged"));
    } catch (e) {}

    setTimeout(() => {
      navigate("/auth/login", { replace: true });
    }, 10);
  };

  function totalItemsCount(order) {
    return (order.items || []).reduce((s, it) => s + Number(it.quantity ?? it.qty ?? 0), 0);
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🚚 Driver Dashboard</h1>

        <div className="flex items-center gap-3">
          <Badge variant="outline">
            <Bell className="h-4 w-4 mr-1" /> {notification || "No new updates"}
          </Badge>

          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      {/* Hidden input for proof upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={onFileChange}
      />

      {deliveries.length === 0 && <p className="text-gray-500">No assigned deliveries yet.</p>}

      {deliveries.map((order) => (
        <Card key={order._id} className="mb-4">
          <CardHeader>
            <CardTitle>{order.customerId?.fullName || "Unknown Customer"}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            <p>
              <strong>Address:</strong> {order.deliveryAddress}
            </p>

            <p className="flex items-center gap-1">
              <strong>Contact:</strong>{" "}
              {order.customerId?.phoneNumber || order.customerId?.phone || "N/A"}
            </p>

            <p>
              <strong>Order Items:</strong>
            </p>

            <ul className="list-disc ml-6">
              {order.items?.map((item, i) => (
                <li key={i}>
                  {item.quantity}x {item.productName}
                </li>
              )) || <li>No items</li>}
            </ul>

            <div className="flex items-center gap-2 mt-2">
              <strong>Status:</strong>
              <Badge
                variant={
                  order.status === "completed"
                    ? "default"
                    : order.status === "cancelled"
                    ? "destructive"
                    : "outline"
                }
              >
                {order.status}
              </Badge>
            </div>

            {order.proofOfDelivery && (
              <img
                src={
                  order.proofOfDelivery.startsWith("http")
                    ? order.proofOfDelivery
                    : `http://localhost:5000${order.proofOfDelivery.startsWith("/") ? "" : "/"}${order.proofOfDelivery}`
                }
                alt="Proof"
                className="rounded-lg mt-3 w-48 border"
              />
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate(order._id, "delivering")}
              >
                <CheckCircle className="h-4 w-4 mr-1" /> On the Way
              </Button>

              <Button
                variant="ghost"
                onClick={() => openLocation(order)}
                className="flex items-center"
              >
                <MapPin className="h-4 w-4 mr-1" /> See Location
              </Button>

              <Button
                variant="default"
                onClick={() => handleDeliverClick(order._id)}
                className="flex items-center"
              >
                <Camera className="h-4 w-4 mr-1" /> Delivered (upload proof)
              </Button>

              <Button
                variant="destructive"
                onClick={() => handleStatusUpdate(order._id, "cancelled")}
              >
                <XCircle className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>

            <div className="text-sm text-muted-foreground mt-2">
              <div>Total items: {totalItemsCount(order)}</div>
              <div>Delivery date: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : "—"}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default DriverDashboard;
