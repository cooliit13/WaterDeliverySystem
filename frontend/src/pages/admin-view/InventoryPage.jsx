import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

function InventoryView() {
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem("inventoryData");
    return saved ? JSON.parse(saved) : [];
  });

  const [name, setName] = useState("");
  const [stock, setStock] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [actionType, setActionType] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    localStorage.setItem("inventoryData", JSON.stringify(products));
  }, [products]);

  function handleAddProduct() {
    if (!name || !stock) return alert("Please enter product and stock");

    const newProduct = {
      id: Date.now().toString(),
      name,
      stock: Number(stock),
      history: [
        {
          type: "Added",
          amount: Number(stock),
          date: new Date().toLocaleString(),
        },
      ],
    };

    setProducts([newProduct, ...products]);
    setName("");
    setStock("");
  }

  function openStockModal(product, type) {
    setCurrentProduct(product);
    setActionType(type);
    setAmount("");
    setModalOpen(true);
  }

  function applyStockChange() {
    if (!amount || Number(amount) <= 0) return;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === currentProduct.id) {
          let newStock = p.stock;

          if (actionType === "Add") newStock += Number(amount);
          if (actionType === "Deduct") newStock -= Number(amount);

          if (newStock < 0) return p;

          return {
            ...p,
            stock: newStock,
            history: [
              { type: actionType, amount: Number(amount), date: new Date().toLocaleString() },
              ...p.history,
            ],
          };
        }
        return p;
      })
    );

    setModalOpen(false);
  }

  function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    setProducts(products.filter((p) => p.id !== id));
  }

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">📦 Inventory Management</h1>

      {/* Add Product */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-3">Add New Product</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Product Name"
            className="border p-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Initial Stock"
            className="border p-2 rounded"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
        <Button onClick={handleAddProduct} className="mt-4 w-full">
          Add Product
        </Button>
      </div>

      {/* Product List */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-4">Current Stock</h2>

        {products.length === 0 ? (
          <p className="text-gray-500">No products yet.</p>
        ) : (
          <ul className="space-y-4">
            {products.map((p) => (
              <li key={p.id} className="p-4 border rounded-lg bg-gray-50 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">{p.name}</h3>
                    <p className="text-blue-600 font-semibold">Stock: {p.stock}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => openStockModal(p, "Add")}>+ Add Stock</Button>
                    <Button onClick={() => openStockModal(p, "Deduct")}>- Deduct Stock</Button>
                    <Button variant="destructive" onClick={() => deleteProduct(p.id)}>
                      Delete
                    </Button>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer font-medium">View Stock History</summary>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {p.history.map((h, i) => (
                      <li key={i}>
                        {h.date} — <strong>{h.type}</strong> {h.amount}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MODAL (Glass UI) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/20 backdrop-blur-xl border border-white/30 p-6 rounded-xl w-80 text-center shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {actionType} Stock — {currentProduct?.name}
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
    </div>
  );
}

export default InventoryView;
