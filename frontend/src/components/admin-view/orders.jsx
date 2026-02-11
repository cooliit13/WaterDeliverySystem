import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
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
  const [selectedDrivers, setSelectedDrivers] = useState({});
  const [productMap, setProductMap] = useState({}); // productId (string) -> title

  // --------- NEW: confirm + info modal state (minimal) ----------
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [pendingDriverId, setPendingDriverId] = useState(null);

  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  const { orderList, orderDetails } = useSelector((s) => s.adminOrder);
  const { drivers } = useSelector((s) => s.adminDrivers);
  // fallback product lists in app state
  const adminProductsList = useSelector((s) => s.adminProducts?.productList ?? []);
  const shopProductsList = useSelector((s) => s.shopProducts?.productList ?? []);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAllOrdersForAdmin());
  }, [dispatch]);

  useEffect(() => {
    dispatch(getAllDrivers());
  }, [dispatch]);

  useEffect(() => {
    if (orderDetails !== null) setOpenDetailsDialog(true);
  }, [orderDetails]);

  // preselect drivers
  useEffect(() => {
    if (!drivers || drivers.length === 0 || !orderList || orderList.length === 0) return;
    setSelectedDrivers((prev) => {
      const next = { ...prev };
      orderList.forEach((order) => {
        if (!next[order._id]) {
          const firstDriver = drivers[0];
          const id = firstDriver?._id ?? firstDriver?.id ?? "";
          if (id) next[order._id] = id;
        }
      });
      return next;
    });
  }, [drivers, orderList]);

  function handleFetchOrderDetails(id) {
    dispatch(getOrderDetailsForAdmin(id));
  }

  // ----------------- Approve flow -----------------
  // minimal approve: call API, refresh list, show info modal on success/failure
  async function handleApprove(orderId, driverId) {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "http://localhost:5000/api/admin/orders/approve",
        { orderId, driverId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // refresh orders
      dispatch(getAllOrdersForAdmin());

      // close confirm and show success info modal
      setConfirmDialogOpen(false);
      setInfoMessage("Order approved and driver assigned");
      setInfoDialogOpen(true);
    } catch (err) {
      console.error(err);
      setConfirmDialogOpen(false);
      setInfoMessage("Failed to approve order");
      setInfoDialogOpen(true);
    }
  }

  // open confirmation modal (called when a driver is selected)
  function openApproveConfirmation(orderId, driverId) {
    setPendingOrderId(orderId);
    setPendingDriverId(driverId);
    setConfirmDialogOpen(true);
  }

  const sourceDrivers = Array.isArray(drivers) ? drivers : [];

  // ----------------- helpers -----------------

  function getItemsArray(order) {
    // support possible shapes: cartItems, items, cart, products
    return order?.cartItems ?? order?.items ?? order?.cart ?? order?.products ?? [];
  }

  // embedded name fields
  function embeddedName(it) {
    return (
      it?.productName ??
      it?.name ??
      it?.title ??
      (it?.product && (it.product.title ?? it.product.name ?? it.product.productName)) ??
      null
    );
  }

  function itemQty(it) {
    return it?.quantity ?? it?.qty ?? it?.count ?? (it?.product && it.product.quantity) ?? 1;
  }

  // Build a small productMap (id -> title) for IDs found in orders
  useEffect(() => {
    if (!orderList || orderList.length === 0) {
      setProductMap({});
      return;
    }

    const ids = new Set();
    orderList.forEach((order) => {
      const items = getItemsArray(order);
      (items || []).forEach((it) => {
        if (!it) return;
        // many shapes:
        if (typeof it === "string") {
          ids.add(String(it));
          return;
        }
        if (it.productId) {
          ids.add(String(it.productId));
          return;
        }
        if (typeof it.product === "string") {
          ids.add(String(it.product));
          return;
        }
        if (it.product && (it.product._id || it.product.id)) {
          ids.add(String(it.product._id ?? it.product.id));
          return;
        }
        if (it._id || it.id) {
          ids.add(String(it._id ?? it.id));
        }
      });
    });

    if (ids.size === 0) {
      setProductMap({});
      return;
    }

    (async () => {
      try {
        const { fetchAllProducts } = await import("@/store/admin/products-slice");
        const action = await dispatch(fetchAllProducts());
        const raw =
          action?.payload?.products ??
          (Array.isArray(action.payload) ? action.payload : action.payload?.data ?? []);
        const map = {};
        (raw || []).forEach((p) => {
          const id = p._id ?? p.id ?? null;
          if (id && ids.has(String(id))) {
            map[String(id)] = p.title ?? p.name ?? p.productName ?? "";
          }
        });
        setProductMap(map);
        console.log("Built productMap for orders:", map);
      } catch (err) {
        console.error("Failed to build product map:", err);
      }
    })();
  }, [orderList, dispatch]);

  // Try to resolve title from productMap, adminProductsList, shopProductsList
  function resolveTitleById(id) {
    if (!id && id !== 0) return null;
    const k = String(id);
    if (productMap && Object.prototype.hasOwnProperty.call(productMap, k)) {
      return productMap[k] || null;
    }
    if (Array.isArray(adminProductsList)) {
      const f = adminProductsList.find((p) => String(p._1d ?? p._id ?? p.id ?? "") === k);
      if (f) return f.title ?? f.name ?? f.productName ?? null;
    }
    if (Array.isArray(shopProductsList)) {
      const f = shopProductsList.find((p) => String(p._id ?? p.id ?? "") === k);
      if (f) return f.title ?? f.name ?? f.productName ?? null;
    }
    return null;
  }

  // ----------------- RENDER ITEMS AS VERTICAL LIST -----------------
  function renderItemsSummary(order) {
    const items = getItemsArray(order);
    if (!items || items.length === 0) return "—";

    return (
      <div className="flex flex-col gap-1 text-sm leading-snug">
        {items.map((it, idx) => {
          const productIdCandidate =
            (typeof it === "string" ? it : null) ??
            it?.productId ??
            (typeof it?.product === "string" ? it.product : null) ??
            it?.product?._id ??
            it?._id ??
            it?.id ??
            null;

          // Try id-based resolution first
          let name = null;
          if (productIdCandidate != null) {
            name = resolveTitleById(productIdCandidate);
          }

          // Fallback to embedded name
          if (!name) {
            name = embeddedName(it);
          }

          // Last resort - show id or Unknown
          if (!name) {
            name = productIdCandidate ? `productId:${String(productIdCandidate)}` : "Unknown product";
          }

          return (
            <div key={idx} className="truncate">
              {name} ×{itemQty(it)}
            </div>
          );
        })}
      </div>
    );
  }

  function totalQuantity(order) {
    const items = getItemsArray(order);
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, it) => sum + Number(itemQty(it) || 0), 0);
  }

  return (
    <>
      {/* Confirm Approve Dialog (minimal) */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Order?</DialogTitle>
          </DialogHeader>

          <div className="mt-2 text-sm text-gray-700">
            Are you sure you want to approve this order and assign the selected driver?
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleApprove(pendingOrderId, pendingDriverId)}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info modal used for "Select driver first" and success/failure */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notice</DialogTitle>
          </DialogHeader>

          <div className="mt-2 text-sm text-gray-700">{infoMessage}</div>

          <DialogFooter className="mt-4">
            <Button onClick={() => setInfoDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Items</TableHead>
                <TableHead>Quantity</TableHead>
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
                  <TableRow key={order._id} className="border-t hover:bg-gray-50">
                    <TableCell className="px-4 py-3 align-top">
                      {renderItemsSummary(order)}
                    </TableCell>
                    <TableCell className="px-4 py-3">{totalQuantity(order)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
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
                    <TableCell className="px-4 py-3">₱{order.totalAmount ?? order.total}</TableCell>
                    <TableCell className="px-4 py-3">
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
                          const label = driver.name ?? driver.fullName ?? driver.email ?? "Driver";
                          if (!id) return null;
                          return (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          );
                        })}
                      </select>

                      <Button
                        className="ml-2 mt-2"
                        onClick={() => {
                          const driverId = (selectedDrivers[order._id] || "").toString().trim();
                          if (!driverId) {
                            // show the info modal instead of alert
                            setInfoMessage("Select driver first");
                            setInfoDialogOpen(true);
                            return;
                          }
                          openApproveConfirmation(order._id, driverId);
                        }}
                      >
                        Approve
                      </Button>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Dialog
                        open={openDetailsDialog}
                        onOpenChange={() => {
                          setOpenDetailsDialog(false);
                          dispatch(resetOrderDetails());
                        }}
                      >
                        <Button onClick={() => handleFetchOrderDetails(order._id)}>View Details</Button>
                        <AdminOrderDetailsView orderDetails={orderDetails} />
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

export default AdminOrdersView;
