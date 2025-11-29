// frontend/src/pages/driver-view/dashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Bell,
  CheckCircle,
  XCircle,
  LogOut,
  Phone,
  Camera,
} from "lucide-react";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

function DriverDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [notification, setNotification] = useState("");
  const navigate = useNavigate();

  const [coordsMap, setCoordsMap] = useState({});

  // file input ref & state
  const fileInputRef = useRef(null);
  const currentOrderRef = useRef(null);
  // flag to indicate the file picker was opened for "deliver" action
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

  // geocode
  const geocodeAddress = async (address) => {
    if (!address) return null;
    if (coordsMap[address]) return coordsMap[address];

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}&limit=1`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "WaterDeliverySystem/1.0 (student@example.com)",
        },
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon } = data[0];
        const coords = { lat: Number(lat), lng: Number(lon) };
        setCoordsMap((prev) => ({ ...prev, [address]: coords }));
        return coords;
      }
    } catch (err) {
      console.error("Geocode error for", address, err);
    }
    return null;
  };

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

    deliveries.forEach((d, idx) => {
      const address = d.deliveryAddress || d.address || "";
      if (!address) return;
      const hasCoords =
        (d.deliveryLocation && d.deliveryLocation.lat && d.deliveryLocation.lng) ||
        coordsMap[address];
      if (!hasCoords) {
        setTimeout(() => {
          geocodeAddress(address);
        }, idx * 250);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveries]);

  // keep existing status update (for on the way / cancel) — deliver handled specially
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

  // ---------- NEW FLOW: Delivered -> pick image -> upload proof -> mark delivered ----------
  const handleDeliverClick = (orderId) => {
    // set refs so file input knows intent
    currentOrderRef.current = orderId;
    pendingDeliverRef.current = true;

    // trigger native file picker
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
          // DO NOT set Content-Type here — browser will set multipart/form-data boundary
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

      // optionally use response data (order with proof url)
      // const uploadJson = await uploadRes.json();

      // 2) Mark order as delivered (call deliver endpoint)
      const deliverRes = await fetch(`http://localhost:5000/api/driver/orders/${orderId}/deliver`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
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
      // reset refs
      pendingDeliverRef.current = false;
      currentOrderRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // file input onChange: detect whether it's for deliver flow
  const onFileChange = (e) => {
    const file = e?.target?.files?.[0] ?? null;
    const orderId = currentOrderRef.current;
    if (!file || !orderId) {
      // cleanup
      pendingDeliverRef.current = false;
      currentOrderRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (pendingDeliverRef.current) {
      // start upload + deliver
      uploadProofAndMarkDelivered(orderId, file);
      return;
    }

    // fallback: if file input used for other actions in future
    // cleanup
    currentOrderRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenFile = (orderId) => {
    // legacy helper if you want a separate Upload Proof button in future
    currentOrderRef.current = orderId;
    pendingDeliverRef.current = false; // not a deliver action
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

  const firstCoords = (() => {
    for (const d of deliveries) {
      const addr = d.deliveryAddress || d.address || "";
      const dbCoords = d.deliveryLocation;
      if (dbCoords && dbCoords.lat && dbCoords.lng) return { lat: dbCoords.lat, lng: dbCoords.lng };
      const c = coordsMap[addr];
      if (c) return c;
    }
    return { lat: 14.5995, lng: 120.9842 };
  })();

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

      <Tabs defaultValue="deliveries">
        <TabsList>
          <TabsTrigger value="deliveries">My Deliveries</TabsTrigger>
          <TabsTrigger value="map">GPS & Navigation</TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries">
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
                  <Phone className="h-4 w-4" />
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
                  ))}
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

                  {/* Delivered button now triggers file picker and upload -> mark delivered */}
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
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>GPS Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Interactive map of assigned deliveries (click marker for details)
              </p>

              <div className="mt-4 h-[400px] w-full rounded-lg overflow-hidden">
                <MapContainer
                  center={[firstCoords.lat, firstCoords.lng]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {deliveries.map((order) => {
                    const dbCoords = order.deliveryLocation;
                    const addr = order.deliveryAddress || order.address || "";

                    const coords = dbCoords && dbCoords.lat && dbCoords.lng
                      ? { lat: dbCoords.lat, lng: dbCoords.lng }
                      : coordsMap[addr];

                    if (!coords) return null;

                    return (
                      <Marker key={order._id} position={[coords.lat, coords.lng]}>
                        <Popup>
                          <div className="max-w-xs">
                            <strong>{order.customerId?.fullName || "Customer"}</strong>
                            <div className="text-sm">{order.deliveryAddress}</div>
                            <div className="mt-1">
                              <Button
                                variant="link"
                                onClick={() =>
                                  window.open(
                                    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                      order.deliveryAddress
                                    )}`
                                  )
                                }
                              >
                                Open in Google Maps
                              </Button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DriverDashboard;
