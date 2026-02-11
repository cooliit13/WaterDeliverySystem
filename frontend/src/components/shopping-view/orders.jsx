// frontend/src/components/shopping-view/orders.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllOrdersByUserId,
  resetOrderDetails, // harmless if not used
  // added cancelOrder and getOrderDetails usage
} from "@/store/shop/order-slice";
import { cancelOrder, getOrderDetails } from "@/store/shop/order-slice"; // added
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router-dom";
import RatingsDialog from "@/components/shopping-view/RatingsDialog"; // ensure this file exists
import { useToast } from "@/components/ui/use-toast"; // added for toasts

function ShoppingOrders() {
  const [productNameMap, setProductNameMap] = useState({}); // id -> name cache
  const [ratingsOrder, setRatingsOrder] = useState(null);
  const [ratingsOpen, setRatingsOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false); // confirm modal state
  const [confirmOrderId, setConfirmOrderId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user } = useSelector((state) => state.auth);
  const { orderList } = useSelector((state) => state.shopOrder || {});
  const productsMaster = useSelector((state) => state.shopProducts?.productList || []);

  useEffect(() => {
    if (user?.id) {
      dispatch(getAllOrdersByUserId(user.id));
    }
  }, [dispatch, user?.id]);

  // product-name resolution code (kept intact; optional)
  useEffect(() => {
    if (!Array.isArray(orderList) || orderList.length === 0) return;

    const ids = new Set();
    orderList.forEach((order) => {
      (order.items || []).forEach((it) => {
        const raw = it?.productId ?? it?.product ?? it?.product_id;
        const pid =
          raw && typeof raw === "object"
            ? (raw._id ?? raw.id ?? raw.productId ?? null)
            : raw;
        if (pid) ids.add(String(pid));
      });
    });

    if (ids.size === 0) return;

    const missing = [];
    ids.forEach((id) => {
      const inMaster = productsMaster.find((p) => String(p._id) === String(id) || String(p.id) === String(id));
      if (!inMaster && !productNameMap[id]) missing.push(id);
    });
    if (missing.length === 0) return;

    const cancelToken = axios.CancelToken.source();
    (async () => {
      try {
        const results = await Promise.allSettled(
          missing.map((pid) =>
            axios.get(`${import.meta.env.VITE_API_BASE || "http://localhost:5000"}/api/shop/products/${encodeURIComponent(pid)}`, { cancelToken: cancelToken.token })
          )
        );

        const newMap = {};
        for (let i = 0; i < results.length; i++) {
          const pid = missing[i];
          const r = results[i];
          if (r.status === "fulfilled" && r.value?.data) {
            const data = r.value.data.product ?? r.value.data.data ?? r.value.data;
            const name = data?.name || data?.title || data?.productName || data?.product?.name || null;
            if (name) {
              newMap[String(pid)] = name;
              continue;
            }
          }
          // fallbacks (admin endpoints etc.) - omitted for brevity but you can keep yours
        }
        if (Object.keys(newMap).length > 0) setProductNameMap((p) => ({ ...p, ...newMap }));
      } catch (err) {
        console.warn("Failed to fetch product names for orders", err);
      }
    })();
    return () => cancelToken.cancel("component unmounted or new fetch started");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderList, productsMaster]);

  const formatPeso = (val) => `₱${Number(val || 0).toFixed(2)}`;

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "confirmed") return "bg-green-500";
    if (s === "rejected") return "bg-red-600";
    if (s.includes("way") || s.includes("out") || s.includes("deliver")) return "bg-yellow-400 text-black";
    return "bg-black";
  };

  function resolveProductName(item) {
    if (!item) return "Unknown product";
    if (item.productName) return item.productName;
    if (item.name) return item.name;
    if (item.title) return item.title;
    const raw = item.productId ?? item.product ?? item.product_id;
    const pid = raw && typeof raw === "object" ? (raw._id ?? raw.id ?? null) : raw;
    if (!pid) return "Unknown product";
    const foundMaster = productsMaster.find((p) => String(p._id) === String(pid) || String(p.id) === String(pid));
    if (foundMaster) return foundMaster.name || foundMaster.title || "Unnamed product";
    if (productNameMap[String(pid)]) return productNameMap[String(pid)];
    return "Unknown product";
  }

  /* ------------- cancel logic ------------- */
  // client-side rule: only allow cancel when status is pending / requested / empty
  function isCancellable(status) {
    const s = String(status || "").toLowerCase();
    if (!s || s === "-" || s.includes("pending") || s.includes("request") || s.includes("requested")) return true;
    const disallowed = ["deliver", "way", "shipped", "completed", "processing", "approved", "out for delivery", "on the way"];
    return !disallowed.some((kw) => s.includes(kw));
  }

  function openConfirmCancel(orderId) {
    setConfirmOrderId(orderId);
    setConfirmOpen(true);
  }

  async function doCancel() {
    if (!confirmOrderId) return;
    setIsCancelling(true);
    try {
      const res = await dispatch(cancelOrder(confirmOrderId)).unwrap();
      if (res && res.success) {
        toast({ title: "Order cancelled" });
        if (user?.id) dispatch(getAllOrdersByUserId(user.id));
      } else {
        toast({ title: res?.message || "Failed to cancel", variant: "destructive" });
      }
    } catch (err) {
      console.error("Cancel failed:", err);
      toast({ title: "Failed to cancel order", variant: "destructive" });
    } finally {
      setIsCancelling(false);
      setConfirmOpen(false);
      setConfirmOrderId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Products</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {orderList && orderList.length > 0 ? (
              orderList.map((order) => {
                const items = order.items || [];

                return (
                  <TableRow key={order._id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {items.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No product data</span>
                        ) : (
                          items.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span className="font-medium">{resolveProductName(item)}</span>
                              <span className="text-sm text-muted-foreground">x{item.quantity}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </TableCell>

                    <TableCell>{order.orderDate ? String(order.orderDate).split("T")[0] : "-"}</TableCell>

                    <TableCell>
                      <Badge className={`py-1 px-3 ${getStatusColor(order.status)}`}>{order.status}</Badge>
                    </TableCell>

                    <TableCell>{formatPeso(order.totalAmount)}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Show Ratings / Feedback only when completed AND feedback not submitted */}
                        {String(order.status || "").toLowerCase() === "completed" && !order.feedbackSubmitted && (
                          <Button
                            onClick={() => {
                              setRatingsOrder(order);
                              setRatingsOpen(true);
                            }}
                          >
                            Ratings / Feedback
                          </Button>
                        )}

                        {String(order.status || "").toLowerCase().includes("way") && (
                          <Button
                            onClick={() => navigate(`/shop/orders/${order._id}/track`)}
                            size="sm"
                            className="bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Track
                          </Button>
                        )}

                        {/* Cancel button: enabled only when cancellable */}
                        <Button
                          onClick={() => openConfirmCancel(order._id)}
                          size="sm"
                          className={
                            isCancellable(order.status)
                              ? "border border-red-500 text-red-600 bg-white hover:bg-red-50"
                              : "opacity-60 cursor-not-allowed border border-gray-200 bg-white text-gray-400"
                          }
                          disabled={!isCancellable(order.status)}
                        >
                          Cancel Order
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan="5" className="text-center py-6 text-sm">No orders yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <RatingsDialog
        open={ratingsOpen}
        onClose={() => {
          setRatingsOpen(false);
          setRatingsOrder(null);
        }}
        order={ratingsOrder}
        onSaved={(updatedOrder) => {
          // refresh user's orders after successful submit so the button disappears
          if (user?.id) dispatch(getAllOrdersByUserId(user.id));
        }}
      />

      {/* Confirm cancel modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Cancel Order</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to cancel this order? This action cannot be undone.</p>

            <div className="flex justify-end gap-3">
              <Button onClick={() => { setConfirmOpen(false); setConfirmOrderId(null); }} variant="ghost">No, keep it</Button>
              <Button onClick={() => doCancel()} className="border border-red-500 text-red-600" disabled={isCancelling}>
                {isCancelling ? "Cancelling..." : "Yes, cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default ShoppingOrders;
