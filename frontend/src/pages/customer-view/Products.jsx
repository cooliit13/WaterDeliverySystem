import { useEffect, useState } from "react";
import axios from "axios";

export default function CustomerProducts() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/products/get-all");
        if (res.data.success) setProducts(res.data.products);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <div key={p._id} className="border p-2">
          <img src={p.image} alt={p.title} className="w-full h-40 object-cover" />
          <h3>{p.title}</h3>
          <p>{p.description}</p>
          <p>${p.price}</p>
        </div>
      ))}
    </div>
  );
}
