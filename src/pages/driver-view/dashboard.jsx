import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Camera,
  DollarSign,
  LogOut,
} from "lucide-react";

function DriverDashboard() {
  const [deliveries, setDeliveries] = useState([
    {
      id: 1,
      customer: "Juan Dela Cruz",
      address: "123 Mabini St, Bukidnon",
      contact: "09123456789",
      orderDetails: "2x Gallon of Water",
      status: "Pending",
    },
    {
      id: 2,
      customer: "Maria Santos",
      address: "456 Rizal Ave, Malaybalay City",
      contact: "09998887777",
      orderDetails: "1x Refilling Tank",
      status: "Delivered",
    },
  ]);

  const [notification, setNotification] = useState("New delivery assigned!");
  const navigate = useNavigate();

  const handleStatusUpdate = (id, newStatus) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("token"); // or however your auth is stored
    localStorage.removeItem("user");
    navigate("/auth/login");
  };

  return (
    <div className="p-6 space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">🚚 Driver Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">
            <Bell className="h-4 w-4 mr-1" /> {notification}
          </Badge>
          <Button
            variant="destructive"
            className="flex items-center"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="deliveries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deliveries">My Deliveries</TabsTrigger>
          <TabsTrigger value="map">GPS & Navigation</TabsTrigger>
          <TabsTrigger value="proof">Proof & Payment</TabsTrigger>
          <TabsTrigger value="reports">Incident Reports</TabsTrigger>
        </TabsList>

        {/* 📦 Deliveries Tab */}
        <TabsContent value="deliveries">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="mb-4">
              <CardHeader>
                <CardTitle>{delivery.customer}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>
                  <strong>Address:</strong> {delivery.address}
                </p>
                <p>
                  <strong>Contact:</strong> {delivery.contact}
                </p>
                <p>
                  <strong>Order:</strong> {delivery.orderDetails}
                </p>
                <div className="flex items-center gap-2">
                  <strong>Status:</strong>
                  <Badge
                    variant={
                      delivery.status === "Delivered"
                        ? "default"
                        : delivery.status === "Canceled"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {delivery.status}
                  </Badge>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate(delivery.id, "On the Way")}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> On the Way
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleStatusUpdate(delivery.id, "Delivered")}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Delivered
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleStatusUpdate(delivery.id, "Canceled")}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Canceled
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 🗺 GPS Navigation */}
        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>GPS & Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <MapPin className="inline h-4 w-4 mr-2" />
                Map integration placeholder — link to Google Maps or other
                navigation service.
              </p>
              <Button variant="default">Open Map</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📸 Proof & Payment */}
        <TabsContent value="proof">
          <Card>
            <CardHeader>
              <CardTitle>Proof of Delivery & Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline">
                <Camera className="h-4 w-4 mr-2" /> Capture Proof Photo
              </Button>
              <Button variant="default">
                <DollarSign className="h-4 w-4 mr-2" /> Record COD Payment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ⚠ Incident Reporting */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Incident Reporting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Describe the issue or failed delivery..." />
              <Button variant="destructive">
                <AlertTriangle className="h-4 w-4 mr-2" /> Submit Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DriverDashboard;
