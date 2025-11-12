import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog } from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import AdminOrderDetailsView from "./order-details";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllOrdersForAdmin,
  getOrderDetailsForAdmin,
  resetOrderDetails,
} from "@/store/admin/order-slice";
import { getAllDrivers } from "@/store/admin/driver-slice";
import { Badge } from "../ui/badge";
import axios from "axios";

function AdminOrdersView() {
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);

  // ✅ state for driver selection
  const [selectedDrivers, setSelectedDrivers] = useState({});

  const { orderList, orderDetails } = useSelector((state) => state.adminOrder);
  const { drivers } = useSelector((state) => state.adminDrivers);

  const dispatch = useDispatch();

  function handleFetchOrderDetails(id) {
    dispatch(getOrderDetailsForAdmin(id));
  }

  useEffect(() => {
    dispatch(getAllOrdersForAdmin());
  }, [dispatch]);

  useEffect(() => {
    dispatch(getAllDrivers());
  }, [dispatch]);

  // debug: log drivers shape when it changes
  useEffect(() => {
    console.log("Drivers (from redux) changed:", drivers);
  }, [drivers]);

  useEffect(() => {
    if (orderDetails !== null) setOpenDetailsDialog(true);
  }, [orderDetails]);

  // ✅ NEW: Preselect first driver for each order when drivers load
  useEffect(() => {
    if (!drivers || drivers.length === 0 || !orderList || orderList.length === 0) return;

    setSelectedDrivers((prev) => {
      const next = { ...prev };
      orderList.forEach((order) => {
        // if there's already a selection for this order, keep it
        if (!next[order._id]) {
          const firstDriver = drivers[0];
          const id = firstDriver?._id ?? firstDriver?.id ?? "";
          if (id) next[order._id] = id;
        }
      });
      // debug selectedDrivers mapping
      console.log("Preselected drivers map:", next);
      return next;
    });
  }, [drivers, orderList]);

  // Approve and assign driver — ✅ added Authorization header (only necessary change)
  async function handleApprove(orderId, driverId) {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        "http://localhost:5000/api/admin/orders/approve",
        { orderId, driverId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Approve response:", res.data); // small debug

      dispatch(getAllOrdersForAdmin());
      alert("Order approved and driver assigned");
    } catch (err) {
      console.error(err);
      alert("Failed to approve order");
    }
  }

  // choose source drivers (could add local fallback if needed)
  const sourceDrivers = Array.isArray(drivers) ? drivers : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Orders</CardTitle>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Driver Assignment</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {orderList && orderList.length > 0 ? (
              orderList.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>{order._id}</TableCell>

                  <TableCell>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={`py-1 px-3 ${
                        order.status === "completed"
                          ? "bg-green-500"
                          : order.status === "cancelled"
                          ? "bg-red-600"
                          : "bg-black"
                      }`}
                    >
                      {order.status}
                    </Badge>
                  </TableCell>

                  <TableCell>₱{order.totalAmount}</TableCell>

                  {/* DRIVER DROPDOWN */}
                  <TableCell>
                    <select
                      value={selectedDrivers[order._id] || ""}
                      onChange={(e) =>
                        setSelectedDrivers({
                          ...selectedDrivers,
                          [order._id]: e.target.value,
                        })
                      }
                      className="border p-2 rounded"
                    >
                      <option value="">Assign Driver</option>

                      {sourceDrivers.map((driver) => {
                        const id = driver._id ?? driver.id ?? "";
                        const label =
                          driver.name ?? driver.fullName ?? driver.email ?? "Driver";
                        // skip any invalid
                        if (!id) return null;
                        return (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>

                    <Button
                      className="ml-2"
                      onClick={() => {
                        const driverId = (selectedDrivers[order._id] || "").toString().trim();

                        // debug
                        console.log("Attempt approve:", { orderId: order._id, driverId });

                        if (!driverId) return alert("Select a driver first");

                        handleApprove(order._id, driverId);
                      }}
                    >
                      Approve
                    </Button>
                  </TableCell>

                  <TableCell>
                    <Dialog
                      open={openDetailsDialog}
                      onOpenChange={() => {
                        setOpenDetailsDialog(false);
                        dispatch(resetOrderDetails());
                      }}
                    >
                      <Button onClick={() => handleFetchOrderDetails(order._id)}>
                        View Details
                      </Button>

                      <AdminOrderDetailsView orderDetails={orderDetails} />
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6}>No orders found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default AdminOrdersView;
