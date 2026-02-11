import { useState, useEffect } from "react";
import CommonForm from "../common/form";
import { DialogContent } from "../ui/dialog";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { useDispatch } from "react-redux";
import {
  getAllOrdersForAdmin,
  getOrderDetailsForAdmin,
  updateOrderStatus,
} from "@/store/admin/order-slice";
import { useToast } from "../ui/use-toast";

const initialFormData = {
  status: "",
};

function AdminOrderDetailsView({ orderDetails }) {
  console.log("🧾 Raw deliveryDate:", orderDetails?.deliveryDate);
  const [formData, setFormData] = useState(initialFormData);
  const dispatch = useDispatch();
  const { toast } = useToast();

  // Sync initial select value with the current order status when orderDetails loads
  useEffect(() => {
    if (orderDetails?.status) {
      setFormData({ status: orderDetails.status });
    } else {
      setFormData(initialFormData);
    }
  }, [orderDetails]);

  function handleUpdateStatus(event) {
    event.preventDefault();

    const newStatus = formData.status;
    if (!newStatus) {
      toast({ title: "Please select a status", variant: "destructive" });
      return;
    }

    dispatch(
      updateOrderStatus({
        id: orderDetails?._id,
        orderStatus: newStatus,
      })
    ).then((data) => {
      if (data?.payload?.success) {
        // re-fetch details + list (you already do this)
        dispatch(getOrderDetailsForAdmin(orderDetails._id));
        dispatch(getAllOrdersForAdmin());
        setFormData(initialFormData);

        // show success toast
        toast({ title: data.payload.message || "Order status updated" });

        // Extra helpful toast: if status changed to completed, payment is auto-marked paid
        if (String(newStatus).toLowerCase() === "completed") {
          toast({ title: "Payment marked as PAID", description: "Order was completed — paymentStatus updated.", variant: "default" });
        }
      } else {
        toast({ title: data?.payload?.message || "Update failed", variant: "destructive" });
      }
    }).catch((err) => {
      console.error("updateOrderStatus error:", err);
      toast({ title: "Network error", variant: "destructive" });
    });
  }

  return (
    <DialogContent className="sm:max-w-[600px]">
      <div className="grid gap-6">

        {/* Order summary */}
        <div className="grid gap-2">
          <div className="flex mt-6 justify-between">
            <p className="font-medium">Order ID</p>
            <Label>{orderDetails?._id}</Label>
          </div>

          <div className="flex justify-between">
            <p className="font-medium">Order Date</p>
            <Label>{orderDetails?.createdAt ? new Date(orderDetails.createdAt).toLocaleDateString() : "—"}</Label>
          </div>

          <div className="flex justify-between">
            <p className="font-medium">Delivery Date</p>
            <Label>
              {orderDetails?.deliveryDate
                ? new Date(orderDetails.deliveryDate).toLocaleDateString()
                : "Not scheduled"}
            </Label>
          </div>

          <div className="flex justify-between">
            <p className="font-medium">Total Amount</p>
            <Label>₱{orderDetails?.totalAmount ?? "0.00"}</Label>
          </div>

          <div className="flex justify-between">
            <p className="font-medium">Payment Status</p>
            <Label>{orderDetails?.paymentStatus ?? "unpaid"}</Label>
          </div>

          <div className="flex justify-between">
            <p className="font-medium">Status</p>
            <Badge
              className={`py-1 px-3 ${
                orderDetails?.status === "completed"
                  ? "bg-green-500"
                  : orderDetails?.status === "cancelled"
                  ? "bg-red-600"
                  : "bg-black"
              }`}
            >
              {orderDetails?.status ?? "—"}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Order Items */}
        <div className="grid gap-4">
          <div className="font-medium">Order Items</div>

          <ul className="grid gap-3">
            {orderDetails?.items?.length > 0 ? (
              orderDetails.items.map((item, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{item.productName}</span>
                  <span>Qty: {item.quantity}</span>
                  <span>₱{item.price}</span>
                </li>
              ))
            ) : (
              <p>No items available</p>
            )}
          </ul>
        </div>

        <Separator />

        {/* Delivery Info */}
        <div className="grid gap-4">
          <div className="font-medium">Customer Info</div>

          <div className="grid gap-1 text-muted-foreground">
            <span>Name: {orderDetails?.customerId?.fullName}</span>
            <span>Email: {orderDetails?.customerId?.email}</span>
          </div>

          <div className="font-medium mt-4">Delivery Address</div>

          <div className="grid gap-1 text-muted-foreground">
            <span>{orderDetails?.deliveryAddress}</span>
          </div>
        </div>

        {/* Update Status Form */}
        <div>
          <CommonForm
            formControls={[
              {
                label: "Update Status",
                name: "status",
                componentType: "select",
                options: [
                  { id: "pending", label: "Pending" },
                  { id: "accepted", label: "Accepted" },
                  { id: "delivering", label: "Delivering" },
                  { id: "completed", label: "Completed" },
                  { id: "cancelled", label: "Cancelled" },
                ],
              },
            ]}
            formData={formData}
            setFormData={setFormData}
            buttonText="Update Order Status"
            onSubmit={handleUpdateStatus}
          />
        </div>
      </div>
    </DialogContent>
  );
}

export default AdminOrderDetailsView;
