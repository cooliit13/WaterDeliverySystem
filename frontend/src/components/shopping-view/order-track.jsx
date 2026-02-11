// components/shop/order-track.jsx (or wherever ShoppingOrders lives)
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
import ShoppingOrderDetailsView from "./order-details";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllOrdersByUserId,
  getOrderDetails,
  resetOrderDetails,
} from "@/store/shop/order-slice";
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router-dom";

function ShoppingOrders() {
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { orderList, orderDetails } = useSelector((state) => state.shopOrder || {});

  // master product list from redux (used to resolve productId -> name)
  const productsMaster = useSelector((state) => state.shopProducts?.productList || []);

  // debug logs (remove when verified)
  useEffect(() => {
    console.log("productsMaster sample:", productsMaster?.length ? productsMaster[0] : productsMaster);
    console.log("orderList sample:", orderList?.length ? orderList[0] : orderList);
  }, [productsMaster, orderList]);

  useEffect(() => {
    if (user?.id) {
      dispatch(getAllOrdersByUserId(user.id));
    }
  }, [dispatch, user?.id]);

  useEffect(() => {
    if (orderDetails !== null) setOpenDetailsDialog(true);
  }, [orderDetails]);

  // Ensure master products loaded if empty (one-time attempt)
  useEffect(() => {
    async function ensureProducts() {
      if (!productsMaster || productsMaster.length === 0) {
        try {
          const { fetchAllProducts } = await import("@/store/shop/products-slice");
          await dispatch(fetchAllProducts());
        } catch (err) {
          console.error("Failed to fetch shop master products:", err);
        }
      }
    }
    ensureProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // robust resolver for many order-item shapes
  function getOrderProducts(order) {
    if (!order) return [];
    const candidates = order.items || order.orderItems || order.products || order.order_items || [];
    const arr = Array.isArray(candidates) ? candidates : [];

    return arr.map((it) => {
      const item = it || {};

      // product object could be item.product or item.productId (object)
      const productObj =
        (item.product && typeof item.product === "object") ? item.product
        : (item.productId && typeof item.productId === "object") ? item.productId
        : null;

      // id string candidates
      const productIdStr =
        (typeof item.product === "string" ? item.product
          : typeof item.productId === "string" ? item.productId
          : (productObj && (productObj._id || productObj.id)) ? String(productObj._id ?? productObj.id)
          : null);

      // name from populated productObj or item fields
      let name =
        (productObj && (productObj.name || productObj.title || productObj.productName)) ||
        item.name ||
        item.title ||
        item.productName ||
        null;

      // lookup in master list if still no name
      if (!name && productIdStr && Array.isArray(productsMaster) && productsMaster.length > 0) {
        const found = productsMaster.find((p) => {
          const pid = String(p._id ?? p.id ?? p._1d ?? p.productId ?? "");
          return pid === String(productIdStr);
        });
        if (found) name = found.name || found.title || found.productName || null;
      }

      // helpful fallback for debugging
      if (!name && productIdStr) name = `product:${productIdStr}`;
      if (!name) name = "Unknown Product";

      const quantity = Number(item.quantity ?? item.qty ?? item.count ?? 1) || 1;
      const unitPrice =
        Number(
          item.unitPrice ??
            item.price ??
            item.salePrice ??
            (productObj && (productObj.price ?? productObj.salePrice)) ??
            0
        ) || 0;

      return { name, quantity, unitPrice };
    });
  }

  function statusClass(status) {
    const s = String(status || "").toLowerCase();
    if (s.includes("confirm")) return "bg-green-500";
    if (s.includes("reject") || s.includes("cancel")) return "bg-red-600";
    if (s.includes("way") || s.includes("out") || s.includes("deliver")) return "bg-yellow-400 text-black";
    return "bg-black";
  }

  function formatPeso(value) {
    const n = Number(value ?? 0) || 0;
    return `₱${n.toFixed(2)}`;
  }

  function handleFetchOrderDetails(getId) {
    dispatch(getOrderDetails(getId));
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
              <TableHead>Order Status</TableHead>
              <TableHead>Order Price</TableHead>
              <TableHead>
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderList && orderList.length > 0 ? (
              orderList.map((orderItem) => {
                const products = getOrderProducts(orderItem);
                const totalFromOrder = Number(orderItem?.totalAmount ?? orderItem?.total ?? orderItem?.grandTotal) || 0;
                const computedTotal =
                  totalFromOrder !== 0
                    ? totalFromOrder
                    : products.reduce((s, p) => s + (p.unitPrice * p.quantity), 0);

                const statusValue = orderItem?.status ?? orderItem?.orderStatus ?? "-";

                return (
                  <TableRow key={orderItem?._id || Math.random()}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {products.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No product data</span>
                        ) : (
                          products.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4">
                              <div className="text-sm">{p.name}</div>
                              <div className="text-xs text-muted-foreground">x{p.quantity}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {orderItem?.orderDate ? String(orderItem.orderDate).split("T")[0] : "-"}
                    </TableCell>

                    <TableCell>
                      <Badge className={`py-1 px-3 ${statusClass(statusValue)}`}>
                        {statusValue}
                      </Badge>
                    </TableCell>

                    <TableCell>{formatPeso(computedTotal)}</TableCell>

                    <TableCell>
                      <Dialog
                        open={openDetailsDialog}
                        onOpenChange={() => {
                          setOpenDetailsDialog(false);
                          dispatch(resetOrderDetails());
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleFetchOrderDetails(orderItem?._id)}
                            size="sm"
                          >
                            View Details
                          </Button>

                          {String(statusValue || "").toLowerCase().includes("way") && (
                            <Button
                              onClick={() => navigate(`/shop/orders/${orderItem?._id}/track`)}
                              size="sm"
                              className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Track
                            </Button>
                          )}
                        </div>

                        <ShoppingOrderDetailsView orderDetails={orderDetails} />
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-gray-500">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default ShoppingOrders;
