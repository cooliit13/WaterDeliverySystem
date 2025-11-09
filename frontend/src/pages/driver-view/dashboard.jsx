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

function DriverDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [notification, setNotification] = useState("");
  const navigate = useNavigate();

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

      const data = await res.json();
      setDeliveries(data);

      if (data.length > 0) {
        setNotification("New delivery assigned!");
      }
    } catch (error) {
      console.log("Error fetching driver orders:", error);
    }
  };

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

      await fetch(
        `http://localhost:5000/api/driver/orders/${orderId}/proof`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

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

        {/* ✅ Deliveries Tab */}
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
                  <strong>Contact:</strong> {order.customerId?.phoneNumber}
                </p>

                <p>
                  <strong>Order Items:</strong>
                </p>

                <ul className="list-disc ml-6">
                  {order.items.map((item, i) => (
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

                {/* ✅ Proof Image Preview */}
                {order.proofOfDelivery && (
                  <img
                    src={`http://localhost:5000${order.proofImage}`}
                    alt="Proof"
                    className="rounded-lg mt-3 w-48 border"
                  />
                )}

                {/* ✅ Buttons */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate(order._id, "delivering")}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> On the Way
                  </Button>

                  <Button
                    variant="default"
                    onClick={() => handleOpenFile(order._id)}
                  >
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

        {/* ✅ Map Page */}
        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>GPS Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Open delivery address in Google Maps
              </p>

              <Button
                variant="default"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      deliveries[0]?.deliveryAddress || ""
                    )}`
                  )
                }
              >
                Open Map
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DriverDashboard;
