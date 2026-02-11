import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - order: order object
 *  - onSaved: (updatedOrder) => void
 */
export default function RatingsDialog({ open, onClose, order, onSaved }) {
  const [productRating, setProductRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [productFeedback, setProductFeedback] = useState("");
  const [driverFeedback, setDriverFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Reset every time dialog opens
  useEffect(() => {
    if (!open) {
      setProductRating(0);
      setDriverRating(0);
      setProductFeedback("");
      setDriverFeedback("");
      setSaving(false);
      setError(null);
      return;
    }

    if (order?.feedbackSubmitted) {
      setError("You already submitted feedback for this order.");
    }
  }, [open, order]);

  const base = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  async function submit() {
    if (!order?._id) return;

    if (String(order.status).toLowerCase() !== "completed") {
      setError("Feedback is only allowed for completed orders.");
      return;
    }

    if (productRating === 0 || driverRating === 0) {
      setError("Please give both Product and Driver a rating.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in.");
      return;
    }

    const payload = {
      productRating,
      productFeedback: productFeedback.trim(),
      driverRating,
      driverFeedback: driverFeedback.trim(),
    };

    try {
      setSaving(true);
      const resp = await axios.post(
        `${base}/api/orders/${order._id}/feedback`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedOrder = resp?.data?.order;

      if (onSaved) onSaved(updatedOrder);
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to submit feedback.");
    } finally {
      setSaving(false);
    }
  }

  function StarGroup({ value, onChange }) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`
              text-4xl transition 
              ${value >= num ? "text-yellow-400" : "text-gray-300"}
              hover:scale-110
            `}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Ratings & Feedback
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="text-red-600 text-sm mb-2">{error}</div>
        )}

        {/* PRODUCT RATING */}
        <div className="mb-4">
          <p className="font-semibold text-base mb-1">Product Rating</p>
          <StarGroup value={productRating} onChange={setProductRating} />

          <textarea
            placeholder="Describe the product quality, cleanliness, taste, etc."
            value={productFeedback}
            onChange={(e) => setProductFeedback(e.target.value)}
            className="border rounded w-full mt-3 p-2 text-sm min-h-[80px]"
          />
        </div>

        {/* DRIVER RATING */}
        <div className="mb-4">
          <p className="font-semibold text-base mb-1">Delivery / Driver Rating</p>
          <StarGroup value={driverRating} onChange={setDriverRating} />

          <textarea
            placeholder="Describe delivery experience, punctuality, friendliness, etc."
            value={driverFeedback}
            onChange={(e) => setDriverFeedback(e.target.value)}
            className="border rounded w-full mt-3 p-2 text-sm min-h-[80px]"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={submit}
            disabled={saving}
            className="bg-blue-600 text-white"
          >
            {saving ? "Saving..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
