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

// ---- Leaflet imports ----
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
// Fix default icon paths for Vite/CRA
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});
// -------------------------

function DriverDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [notification, setNotification] = useState("");
  const navigate = useNavigate();

  // geocoded coords cache: { "<address>": { lat, lng } }
  const [coordsMap, setCoordsMap] = useState({});

  // hidden file input reference
  const fileInputRef = useRef(null);
  const currentOrderRef = useRef(null);

  // ✅ Load driver orders
  useEffect(() => {
    fetchDriverOrders();
  }, []);

  const fetchDriverOrders = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/driver/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await res.json();
      const orders = Array.isArray(payload)
        ? payload
        : payload.orders ?? payload.data ?? [];

      setDeliveries(orders);

      if (orders.length > 0) {
        setNotification("New delivery assigned!");
      } else {
        setNotification("");
      }
    } catch (error) {
      console.log("Error fetching driver orders:", error);
    }
  };

  // ---- Geocode addresses using Nominatim (free) ----
  // Minimal, polite use: cache results locally and only fetch if not cached.
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

  // When deliveries change: first populate coordsMap from any deliveryLocation stored in DB,
  // then geocode addresses that still have no coords.
  useEffect(() => {
    if (!deliveries || deliveries.length === 0) return;

    // 1) Seed coordsMap with deliveryLocation from each order if present
    setCoordsMap((prev) => {
      const next = { ...prev };
      deliveries.forEach((d) => {
        const address = d.deliveryAddress || d.address || "";
        if (d.deliveryLocation && d.deliveryLocation.lat && d.deliveryLocation.lng) {
          // Use DB-provided coordinates immediately
          next[address] = {
            lat: d.deliveryLocation.lat,
            lng: d.deliveryLocation.lng,
          };
        }
      });
      return next;
    });

    // 2) Geocode remaining addresses (that do not have coords yet)
    deliveries.forEach((d, idx) => {
      const address = d.deliveryAddress || d.address || "";
      if (!address) return;
      // Only geocode if neither DB-provided coords nor cached coords exist
      const hasCoords = (d.deliveryLocation && d.deliveryLocation.lat && d.deliveryLocation.lng) || coordsMap[address];
      if (!hasCoords) {
        setTimeout(() => {
          geocodeAddress(address);
        }, idx * 250); // 250ms spacing
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveries]);

  // ✅ Update delivery status
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("token");

      await fetch(`http://localhost:5000/api/driver/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      fetchDriverOrders();
    } catch (error) {
      console.log("Status update error:", error);
    }
  };

  // ✅ Upload Proof of Delivery
  const uploadProof = async (file) => {
    if (!file || !currentOrderRef.current) return;

    const orderId = currentOrderRef.current;
    const formData = new FormData();
    formData.append("proof", file);

    try {
      const token = localStorage.getItem("token");

      await fetch(`http://localhost:5000/api/driver/orders/${orderId}/proof`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      fetchDriverOrders(); // reload list
    } catch (error) {
      console.log("Upload error:", error);
    }
  };

  const handleOpenFile = (orderId) => {
    currentOrderRef.current = orderId;
    fileInputRef.current.click();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/auth/login");
  };

  // Map center: first available geocoded delivery or fallback coordinates
  const firstCoords = (() => {
    for (const d of deliveries) {
      const addr = d.deliveryAddress || d.address || "";
      const dbCoords = d.deliveryLocation;
      if (dbCoords && dbCoords.lat && dbCoords.lng) return { lat: dbCoords.lat, lng: dbCoords.lng };
      const c = coordsMap[addr];
      if (c) return c;
    }
    // fallback: Manila center approximately
    return { lat: 14.5995, lng: 120.9842 };
  })();

  return (
    <div className="p-6 space-y-8">
      {/* HEADER */}
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
        onChange={(e) => uploadProof(e.target.files[0])}
      />

      <Tabs defaultValue="deliveries">
        <TabsList>
          <TabsTrigger value="deliveries">My Deliveries</TabsTrigger>
          <TabsTrigger value="map">GPS & Navigation</TabsTrigger>
        </TabsList>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries">
          {deliveries.length === 0 && (
            <p className="text-gray-500">No assigned deliveries yet.</p>
          )}

          {deliveries.map((order) => (
            <Card key={order._id} className="mb-4">
              <CardHeader>
                <CardTitle>
                  {order.customerId?.fullName || "Unknown Customer"}
                </CardTitle>
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

                {/* Proof Image Preview (uses proofOfDelivery) */}
                {order.proofOfDelivery && (
                  <img
                    src={`http://localhost:5000${
                      order.proofOfDelivery.startsWith("/")
                        ? order.proofOfDelivery
                        : "/" + order.proofOfDelivery
                    }`}
                    alt="Proof"
                    className="rounded-lg mt-3 w-48 border"
                  />
                )}

                {/* Buttons */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate(order._id, "delivering")}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> On the Way
                  </Button>

                  <Button variant="default" onClick={() => handleOpenFile(order._id)}>
                    <Camera className="h-4 w-4 mr-1" /> Upload Proof
                  </Button>

                  <Button
                    variant="default"
                    onClick={() => handleStatusUpdate(order._id, "completed")}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Delivered
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

        {/* Map Page */}
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
                    // Prefer DB-provided deliveryLocation
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
