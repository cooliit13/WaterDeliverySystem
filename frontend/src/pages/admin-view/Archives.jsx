// src/components/admin-view/Archives.jsx
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Archives({
  isOpen = false,
  onClose = () => {},
  archives = { posSales: [], adminOrders: [], expenseMonths: [] },
  onRestorePos = () => {},
  onDeletePos = () => {},
  onRestoreOrder = () => {},
  onDeleteOrder = () => {},
  onRestoreExpenseMonth = () => {},
  onDeleteExpenseMonth = () => {},
}) {
  // if parent tells us to hide, don't render modal
  if (!isOpen) return null;

  // close on Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/50"
      onClick={() => onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-4xl rounded-lg shadow-lg overflow-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // prevent backdrop click when interacting inside
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Archives</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* POS archives */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Archived Walk-in Sales</h3>
              <div className="text-sm text-gray-500">{archives.posSales.length}</div>
            </div>

            {archives.posSales.length === 0 ? (
              <div className="text-sm text-gray-500">No archived walk-in sales.</div>
            ) : (
              <ul className="space-y-2">
                {archives.posSales.map((p) => (
                  <li key={p._id || p.id} className="p-3 rounded border bg-gray-50 flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium">{p.customer?.name || p.customer?.customerName || "Walk-in Customer"}</div>
                      <div className="text-xs text-gray-500">{new Date(p.createdAt || p.date || Date.now()).toLocaleString()}</div>
                      <div className="text-sm mt-1">₱{(p.totals?.total ?? p.total ?? 0).toFixed(2)}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={() => onRestorePos(p)}>Restore</Button>
                      <Button size="sm" variant="destructive" onClick={() => onDeletePos(p._id || p.id)}>Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Orders archives */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Archived Delivery Orders</h3>
              <div className="text-sm text-gray-500">{archives.adminOrders.length}</div>
            </div>

            {archives.adminOrders.length === 0 ? (
              <div className="text-sm text-gray-500">No archived orders.</div>
            ) : (
              <ul className="space-y-2">
                {archives.adminOrders.map((o) => (
                  <li key={o._id || o.id} className="p-3 rounded border bg-gray-50 flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium">{o.customerId?.fullName || "Customer"}</div>
                      <div className="text-xs text-gray-500">{new Date(o.deliveryDate || o.updatedAt || o.createdAt || Date.now()).toLocaleString()}</div>
                      <div className="text-sm mt-1">₱{(Array.isArray(o.items) ? o.items.reduce((s, it) => s + (Number(it.price ?? 0) * Number(it.quantity ?? it.qty ?? 0)), 0) : 0).toFixed(2)}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={() => onRestoreOrder(o)}>Restore</Button>
                      <Button size="sm" variant="destructive" onClick={() => onDeleteOrder(o._id || o.id)}>Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Expense months archives */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Archived Expense Months</h3>
              <div className="text-sm text-gray-500">{archives.expenseMonths.length}</div>
            </div>

            {archives.expenseMonths.length === 0 ? (
              <div className="text-sm text-gray-500">No archived expense months.</div>
            ) : (
              <ul className="space-y-2">
                {archives.expenseMonths.map((g) => (
                  <li key={g.month} className="p-3 rounded border bg-gray-50 flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium">{g.month}</div>
                      <div className="text-xs text-gray-500">Entries: {g.entries.length} • Total: ₱{(g.monthlyTotal ?? 0).toFixed(2)}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={() => onRestoreExpenseMonth(g)}>Restore</Button>
                      <Button size="sm" variant="destructive" onClick={() => onDeleteExpenseMonth(g.month)}>Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
