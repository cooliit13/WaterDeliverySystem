// src/pages/admin-view/InventoryPage.jsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";

function InventoryView() {
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [actionType, setActionType] = useState("");
  const [amount, setAmount] = useState("");

  // EDIT modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState({ title: "", price: "", description: "" });
  const [editLoading, setEditLoading] = useState(false);

  // POS
  const [posSales, setPosSales] = useState([]);
  const [posLoading, setPosLoading] = useState(false);

  const { toast } = useToast();

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/products/get-all", {
        headers: authHeaders(),
      });
      setProducts(res.data?.products ?? []);
      console.log("fetchProducts -> loaded", (res.data?.products ?? []).length, "products");
    } catch (err) {
      console.error("Failed to fetch products", err);
      toast({ title: "Failed to fetch products", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchPosSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPosSales() {
    setPosLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/admin/pos/list", {
        headers: authHeaders(),
      });
      setPosSales(res.data?.sales ?? res.data ?? []);
    } catch (err) {
      console.warn("Failed to fetch POS sales", err);
      toast({ title: "Failed to load walk-in sales", variant: "destructive" });
    } finally {
      setPosLoading(false);
    }
  }

  function openStockModal(product, type) {
    setCurrentProduct(product);
    setActionType(type);
    setAmount("");
    setModalOpen(true);
  }

  // in src/pages/admin-view/InventoryPage.jsx -> replace applyStockChange with this
const applyStockChange = async () => {
  if (!amount || Number(amount) <= 0) {
    toast({ title: "Enter a valid amount", variant: "destructive" });
    return;
  }
  if (!currentProduct) return;

  const delta = actionType === "Add" ? Math.abs(Number(amount)) : -Math.abs(Number(amount));
  const currentStock = Number(currentProduct.stock ?? 0);
  const newStock = currentStock + delta;
  if (newStock < 0) {
    toast({ title: "Resulting stock cannot be negative", variant: "destructive" });
    return;
  }

  // Prepare guarded payload using exact updatedAt string from server
  const payload = {
    newStock,
    clientUpdatedAt: currentProduct.updatedAt, // exact raw string
  };

  try {
    console.log("applyStockChange (guarded) -> payload:", payload);
    const res = await axios.post(
      `http://localhost:5000/api/admin/products/${currentProduct._id}/stock`,
      payload,
      { headers: { ...authHeaders(), "Content-Type": "application/json" } }
    );

    if (res.data?.success) {
      toast({ title: "Stock updated" });
      setModalOpen(false);
      setCurrentProduct(null);
      fetchProducts();
    } else {
      toast({ title: res.data?.message || "Failed to update stock", variant: "destructive" });
    }
  } catch (err) {
    console.error("Guarded update stock error:", err);
    if (err.response?.status === 409 && err.response.data?.product) {
      // conflict: server returned current product; update local and inform admin
      const latest = err.response.data.product;
      setProducts((prev) => prev.map((p) => (p._id === latest._id ? latest : p)));
      setCurrentProduct(latest);
      toast({ title: "Conflict: product not changed. Form updated with latest values.", variant: "destructive" });
    } else if (err.response?.data?.message) {
      toast({ title: err.response.data.message, variant: "destructive" });
    } else {
      toast({ title: "Failed to update stock", variant: "destructive" });
    }
  }
};

  const deleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await axios.delete(`http://localhost:5000/api/admin/products/delete/${id}`, {
        headers: authHeaders(),
      });
      console.log("deleteProduct -> response", res.status, res.data);
      if (res.data?.success) {
        toast({ title: "Product deleted" });
        fetchProducts();
      } else {
        toast({ title: "Delete failed", variant: "destructive" });
      }
    } catch (err) {
      console.error("Delete product error:", err);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  // Edit flow (timestamp-aware)
  function openEditModal(product) {
    setCurrentProduct(product);
    setEditValues({
      title: product.title ?? product.name ?? "",
      price: product.price ?? "",
      description: product.description ?? "",
    });
    setEditOpen(true);
    console.log("openEditModal -> product opened for edit:", product._id, "updatedAt:", product.updatedAt);
  }

  async function submitEdit() {
    if (!currentProduct) return;
    setEditLoading(true);

    try {
      // IMPORTANT: send the exact updatedAt string that came from the server
      const payload = {
        title: editValues.title,
        price: editValues.price,
        description: editValues.description,
        clientUpdatedAt: currentProduct.updatedAt,
      };

      // Debug log so you can see what frontend will send
      console.log(">>> SUBMIT EDIT payload:", JSON.stringify(payload));

      const res = await axios.put(
        `http://localhost:5000/api/admin/products/edit/${currentProduct._id}`,
        payload,
        { headers: { ...authHeaders(), "Content-Type": "application/json" } }
      );

      console.log("submitEdit -> response", res.status, res.data);

      if (res.data?.success) {
        toast({ title: "Product updated" });
        setEditOpen(false);
        setCurrentProduct(null);
        fetchProducts();
      } else {
        toast({ title: res.data?.message || "Update failed", variant: "destructive" });
      }
    } catch (err) {
      console.error("Edit product error:", err);

      if (err.response?.status === 409 && err.response.data?.product) {
        toast({
          title: "Conflict: product changed since you opened it",
          variant: "destructive",
        });

        const latest = err.response.data.product;
        setProducts((prev) => prev.map((p) => (p._id === latest._id ? latest : p)));

        setCurrentProduct(latest);
        setEditValues({
          title: latest.title ?? latest.name ?? "",
          price: latest.price ?? "",
          description: latest.description ?? "",
        });

        console.log("submitEdit -> conflict, replaced with latest:", latest._id, "updatedAt:", latest.updatedAt);
      } else if (err.response?.status === 400 && err.response?.data?.message) {
        toast({ title: err.response.data.message, variant: "destructive" });
        console.warn("submitEdit -> 400 response:", err.response.data);
      } else {
        toast({ title: "Failed to update product", variant: "destructive" });
      }
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">📦 Inventory Management</h1>

      {/* Product List */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-4">Current Stock</h2>

        {products.length === 0 ? (
          <p className="text-gray-500">No products yet.</p>
        ) : (
          <ul className="space-y-4">
            {products.map((p) => (
              <li key={p._id} className="p-4 border rounded-lg bg-gray-50 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">{p.title || p.name || p.productName}</h3>
                    <p className="text-blue-600 font-semibold">Stock: {p.stock ?? 0}</p>
                    <p className="text-sm text-gray-600">Price: ₱{(p.price ?? 0).toFixed(2)}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => openStockModal(p, "Add")}>+ Add Stock</Button>
                    <Button onClick={() => openStockModal(p, "Deduct")}>- Deduct Stock</Button>
                    <Button onClick={() => openEditModal(p)}>Edit</Button>
                    <Button variant="destructive" onClick={() => deleteProduct(p._id)}>
                      Delete
                    </Button>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer font-medium">View Product Info</summary>
                  <div className="mt-2 text-sm text-gray-700">
                    <div><strong>ID:</strong> {p._id}</div>
                    <div><strong>Description:</strong> {p.description ?? "—"}</div>
                    <div><strong>Created:</strong> {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</div>

                    {/* Minimal concurrency visibility */}
                    <div className="mt-2 text-xs text-gray-500">
                      <div><strong>__v (version):</strong> {p.__v ?? "—"}</div>
                      <div><strong>updatedAt:</strong> {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "—"}</div>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* EDIT MODAL */}
      {editOpen && currentProduct && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[460px] shadow-xl">
            <h3 className="text-lg font-bold mb-3">Edit Product — {currentProduct._id}</h3>

            <label className="text-sm">Title</label>
            <input
              className="w-full border p-2 rounded mb-2"
              value={editValues.title}
              onChange={(e) => setEditValues((s) => ({ ...s, title: e.target.value }))}
            />

            <label className="text-sm">Price</label>
            <input
              type="number"
              className="w-full border p-2 rounded mb-2"
              value={editValues.price}
              onChange={(e) => setEditValues((s) => ({ ...s, price: e.target.value }))}
            />

            <label className="text-sm">Description</label>
            <textarea
              className="w-full border p-2 rounded mb-3"
              rows={3}
              value={editValues.description}
              onChange={(e) => setEditValues((s) => ({ ...s, description: e.target.value }))}
            />

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => { setEditOpen(false); setCurrentProduct(null); }}>
                Cancel
              </Button>
              <Button onClick={submitEdit} disabled={editLoading}>
                {editLoading ? "Saving…" : "Save"}
              </Button>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              <div><strong>Timestamp (sent on save):</strong> {currentProduct.updatedAt ?? "—"}</div>
            </div>
          </div>
        </div>
      )}

      {/* STOCK MODAL */}
      {modalOpen && currentProduct && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/20 backdrop-blur-xl border border-white/30 p-6 rounded-xl w-80 text-center shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {actionType} Stock — {currentProduct?.title || currentProduct?.name}
            </h2>

            <input
              type="number"
              placeholder="Enter amount"
              className="w-full border p-2 rounded mb-4"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <div className="flex justify-between gap-3">
              <Button className="w-full" onClick={applyStockChange}>
                Confirm
              </Button>
              <Button className="w-full" variant="destructive" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-in Sales (POS) Panel */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Walk-in Sales (POS)</h2>
          <div className="text-sm text-gray-500">{posLoading ? "Loading…" : `${posSales.length} total`}</div>
        </div>

        {posSales.length === 0 ? (
          <p className="text-gray-500">No walk-in sales recorded.</p>
        ) : (
          <ul className="space-y-3">
            {posSales.slice(0, 8).map((sale) => (
              <li key={sale._id || sale.id} className="p-3 rounded-md bg-gray-50 border flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>{sale.customer?.name || sale.customer?.customerName || "Walk-in Customer"}</strong>
                    <span className="ml-3 text-xs text-gray-400">{new Date(sale.createdAt || Date.now()).toLocaleString()}</span>
                  </div>

                  <div className="text-sm text-gray-700">
                    {Array.isArray(sale.items)
                      ? sale.items.map((it) => `${it.name || it.productName || "Item"} x${it.qty || it.quantity || 0}`).join(" • ")
                      : ""}
                  </div>
                </div>

                <div className="ml-4 text-right">
                  <div className="font-semibold">₱{(sale.totals?.total ?? sale.total ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{sale.note || ""}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default InventoryView;
