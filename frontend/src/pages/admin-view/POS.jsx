// components/admin-view/POS.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

/**
 * Minimal POS for admin (walk-in sales).
 * - Fetches products from GET /api/admin/products/get
 * - Lets admin add products + quantity to a local cart
 * - Collect customer name/contact
 * - POSTs sale to /api/admin/pos/sale
 *
 * Only necessary UI/logic added.
 */

function formatPeso(n) {
  if (n == null) return "₱0.00";
  return `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminPOS() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]); // { productId, name, price, qty, image }
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    // fetch products (public shop GET returns products & products key)
    axios
      .get("http://localhost:5000/api/admin/products/get")
      .then((res) => {
        const payload = res.data;
        const list = payload?.products ?? payload?.data ?? payload ?? [];
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error("POS: Failed to fetch products", err);
        toast({ title: "Failed to load products", variant: "destructive" });
      });
  }, [toast]);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = (p.name || p.title || "").toString().toLowerCase();
      const desc = (p.description || p.shortDescription || "").toString().toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [products, query]);

  function addToCart(product) {
    setCart((prev) => {
      const found = prev.find((i) => i.productId === product._id);
      if (found) {
        return prev.map((i) =>
          i.productId === product._id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name || product.title || "Product",
          price: Number(product.price || 0),
          qty: 1,
          image: product.image || null,
        },
      ];
    });
  }

  function changeQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = 0; // keep simple (add if needed)
  const total = subtotal + tax;

  async function handleCompleteSale() {
    if (!cart.length) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    if (!customerName.trim()) {
      toast({ title: "Please enter customer name", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/admin/pos/sale",
        {
          customer: { name: customerName.trim(), contact: customerContact.trim() || null },
          items: cart.map((i) => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })),
          totals: { subtotal, tax, total },
          note: "POS walk-in sale",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        toast({ title: "Sale recorded" });
        // Reset cart & customer
        setCart([]);
        setCustomerContact("");
        setCustomerName("");
      } else {
        console.warn("POS sale response:", res.data);
        toast({ title: "Failed to record sale", variant: "destructive" });
      }
    } catch (err) {
      console.error("POS: sale failed", err);
      toast({ title: "Failed to record sale", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">POS — Walk-in Sale</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: product list & search */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-3">
            <input
              className="flex-1 border rounded px-3 py-2"
              placeholder="Search products by name or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="text-sm text-gray-500">{filtered.length} products</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[480px] overflow-auto">
            {filtered.map((p) => (
              <div key={p._id} className="bg-white shadow rounded p-2 flex flex-col">
                <img src={p.image || "/placeholder.png"} alt={p.name || p.title} className="h-28 w-full object-cover rounded" />
                <div className="mt-2 text-sm font-semibold">{p.name || p.title}</div>
                <div className="text-xs text-gray-500 truncate">{p.shortDescription || p.description || ""}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="font-bold text-blue-600">{formatPeso(p.price)}</div>
                  <Button size="sm" onClick={() => addToCart(p)}>Add</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: cart summary */}
        <aside className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold">Cart</h3>
          <div className="mt-3 space-y-3 max-h-[320px] overflow-auto">
            {cart.length === 0 ? (
              <div className="text-sm text-gray-500">Cart is empty</div>
            ) : (
              cart.map((i) => (
                <div key={i.productId} className="flex items-center gap-3">
                  <img src={i.image || "/placeholder.png"} alt={i.name} className="w-12 h-12 object-cover rounded" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{i.name}</div>
                    <div className="text-xs text-gray-500">{formatPeso(i.price)} x {i.qty}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="px-2 py-1 border rounded" onClick={() => changeQty(i.productId, -1)}>-</button>
                    <div className="px-2">{i.qty}</div>
                    <button className="px-2 py-1 border rounded" onClick={() => changeQty(i.productId, +1)}>+</button>
                    <button className="ml-2 text-red-500" onClick={() => removeFromCart(i.productId)}>Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 border-t pt-3">
            <div className="flex justify-between text-sm"><div>Subtotal</div><div>{formatPeso(subtotal)}</div></div>
            <div className="flex justify-between text-sm"><div>Tax</div><div>{formatPeso(tax)}</div></div>
            <div className="flex justify-between font-bold text-lg mt-2"><div>Total</div><div>{formatPeso(total)}</div></div>
          </div>

          <div className="mt-4">
            <label className="block text-sm">Customer name</label>
            <input className="w-full border rounded px-2 py-1 mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />

            <label className="block text-sm mt-2">Contact (optional)</label>
            <input className="w-full border rounded px-2 py-1 mt-1" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} />
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={() => { setCart([]); setCustomerName(""); setCustomerContact(""); }}>Clear</Button>
            <Button onClick={handleCompleteSale} disabled={isSubmitting} className="ml-auto">
              {isSubmitting ? "Saving..." : "Complete Sale"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
