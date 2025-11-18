import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProductImageUpload from "@/components/admin-view/image-upload";
import { Button } from "@/components/ui/button";
import {
  addFeatureImage,
  getFeatureImages,
  deleteFeatureImage,
} from "@/store/common-slice";

import * as XLSX from "xlsx";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";

function AdminDashboard() {
  // ======= Feature Image State =======
  const [imageFile, setImageFile] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [imageLoadingState, setImageLoadingState] = useState(false);
  const dispatch = useDispatch();
  const { featureImageList } = useSelector((state) => state.commonFeature);

  // ======= Expense Input Fields =======
  const [electric, setElectric] = useState("");
  const [water, setWater] = useState("");
  const [gas, setGas] = useState("");
  const [other, setOther] = useState("");
  const [duration, setDuration] = useState("weekly"); // weekly | monthly

  // ======= Expense History State (persisted) =======
  const [expenseHistory, setExpenseHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("expenseHistory");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // ======= Collapse State For Each Month =======
  const [collapsedMonths, setCollapsedMonths] = useState({});

  // ======= Editing State =======
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editingValues, setEditingValues] = useState({
    electric: "",
    water: "",
    gas: "",
    other: "",
  });

  // ======= POS / Walk-in Sales State (NEW) =======
  const [posSales, setPosSales] = useState([]); // array of POS sales
  const [posLoading, setPosLoading] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState(null);

  // ======= Orders state (for delivery summaries) =======
  const [adminOrders, setAdminOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ======= Product map for resolving productId -> title =======
  const [productMap, setProductMap] = useState({}); // id (string) -> title

  // ======= Date filter state (NEW) =======
  const [filterStart, setFilterStart] = useState(""); // yyyy-mm-dd
  const [filterEnd, setFilterEnd] = useState(""); // yyyy-mm-dd

  const { toast } = useToast();

  // ======= Load feature images =======
  useEffect(() => {
    dispatch(getFeatureImages());
  }, [dispatch]);

  // ======= Persist expenseHistory to localStorage on change =======
  useEffect(() => {
    try {
      localStorage.setItem("expenseHistory", JSON.stringify(expenseHistory));
    } catch (e) {
      console.error("Failed to persist expenseHistory", e);
    }
  }, [expenseHistory]);

  // ======= Upload Feature Image =======
  function handleUploadFeatureImage() {
    if (!uploadedImageUrl) return;
    dispatch(addFeatureImage(uploadedImageUrl)).then((data) => {
      if (data?.payload?.success) {
        dispatch(getFeatureImages());
        setImageFile(null);
        setUploadedImageUrl("");
      }
    });
  }

  // ======= Delete Feature Image =======
  function handleDeleteImage(imageId) {
    if (window.confirm("Are you sure you want to delete this image?")) {
      dispatch(deleteFeatureImage(imageId)).then((data) => {
        if (data?.payload?.success) dispatch(getFeatureImages());
      });
    }
  }

  // ======= Save Expense Entry (Stores as Weekly Normalized) =======
  function handleSaveExpense() {
    const e = Number(electric || 0);
    const w = Number(water || 0);
    const g = Number(gas || 0);
    const o = Number(other || 0);
    const factor = duration === "monthly" ? 1 / 4 : 1;

    const newEntry = {
      id: Date.now().toString(),
      electric: +(e * factor).toFixed(2),
      water: +(w * factor).toFixed(2),
      gas: +(g * factor).toFixed(2),
      other: +(o * factor).toFixed(2),
      inputDuration: duration,
      dateISO: new Date().toISOString(),
    };

    setExpenseHistory((prev) => [newEntry, ...prev]);
    setElectric("");
    setWater("");
    setGas("");
    setOther("");
  }

  // ======= Group Entries by Month =======
  const groupedByMonth = useMemo(() => {
    const groups = {};
    expenseHistory.forEach((entry) => {
      const d = new Date(entry.dateISO);
      const monthKey = d.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(entry);
    });

    const arr = Object.entries(groups).map(([month, entries]) => {
      const monthlyTotal = entries.reduce(
        (s, it) =>
          s +
          Number(it.electric || 0) +
          Number(it.water || 0) +
          Number(it.gas || 0) +
          Number(it.other || 0),
        0
      );
      return { month, entries, monthlyTotal };
    });

    arr.sort((a, b) => new Date(b.entries[0].dateISO) - new Date(a.entries[0].dateISO));
    return arr;
  }, [expenseHistory]);

  // ======= Toggle Collapse =======
  function toggleMonth(month) {
    setCollapsedMonths((prev) => ({ ...prev, [month]: !prev[month] }));
  }

  // ======= Export to Excel =======
  function exportMonthToExcel(group) {
    const sheetData = group.entries.map((entry) => ({
      Date: new Date(entry.dateISO).toLocaleString(),
      Duration: entry.inputDuration,
      Electric: entry.electric,
      Water: entry.water,
      Gas: entry.gas,
      Other: entry.other,
      Total:
        Number(entry.electric || 0) +
        Number(entry.water || 0) +
        Number(entry.gas || 0) +
        Number(entry.other || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, group.month);
    XLSX.writeFile(workbook, `${group.month}-Expenses.xlsx`);
  }

  // ======= Print Month =======
  function printMonth(group) {
    const printWindow = window.open("", "_blank");
    const htmlContent = `
      <html>
        <head>
          <title>${group.month} Expense Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
            h1 { font-size: 20px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>${group.month} — Expense Report</h1>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Duration</th>
                <th>Electric</th>
                <th>Water</th>
                <th>Gas</th>
                <th>Other</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${group.entries
                .map((e) => {
                  const total =
                    Number(e.electric || 0) +
                    Number(e.water || 0) +
                    Number(e.gas || 0) +
                    Number(e.other || 0);
                  return `<tr>
                    <td>${new Date(e.dateISO).toLocaleString()}</td>
                    <td>${e.inputDuration}</td>
                    <td>₱${e.electric}</td>
                    <td>₱${e.water}</td>
                    <td>₱${e.gas}</td>
                    <td>₱${e.other}</td>
                    <td>₱${total}</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    } else {
      alert("Pop-up blocked. Please allow pop-ups for printing.");
    }
  }

  // ======= Current form total =======
  const totalCost = useMemo(() => {
    return (
      Number(electric || 0) +
      Number(water || 0) +
      Number(gas || 0) +
      Number(other || 0)
    );
  }, [electric, water, gas, other]);

  // ======= NEW: Fetch POS (walk-in) sales and dashboard summary and admin orders =======
  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // fetch pos list
    setPosLoading(true);
    axios
      .get("http://localhost:5000/api/admin/pos/list", { headers })
      .then((res) => {
        const list = res.data?.sales ?? res.data ?? [];
        setPosSales(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.warn("Failed to fetch POS sales", err);
        toast({ title: "Failed to load walk-in sales", variant: "destructive" });
      })
      .finally(() => setPosLoading(false));

    // fetch dashboard summary (optional backend)
    axios
      .get("http://localhost:5000/api/admin/dashboard/summary", { headers })
      .then((res) => {
        if (res.data?.success) setDashboardSummary(res.data);
      })
      .catch(() => {
        // summary optional — ignore failure
      });

    // fetch admin orders (used to compute delivery daily/monthly totals)
    setOrdersLoading(true);
    axios
      .get("http://localhost:5000/api/admin/orders/get", { headers })
      .then(async (res) => {
        const orders = res.data?.orders ?? res.data ?? [];
        setAdminOrders(Array.isArray(orders) ? orders : []);

        // ALSO fetch products to build a productId -> title map so dashboard can resolve names
        // (only if we actually have orders)
        try {
          if (Array.isArray(orders) && orders.length > 0) {
            const prodRes = await axios.get("http://localhost:5000/api/admin/products/get", { headers });
            const products = prodRes.data?.products ?? prodRes.data ?? [];
            const map = {};
            (Array.isArray(products) ? products : []).forEach((p) => {
              const id = p._id ?? p.id ?? null;
              if (id) {
                map[String(id)] = p.title ?? p.name ?? p.productName ?? "";
              }
            });
            setProductMap(map);
          }
        } catch (prodErr) {
          console.warn("Failed to fetch products for dashboard mapping", prodErr);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch admin orders", err);
      })
      .finally(() => setOrdersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ======= Date helper =======
  const parseToDay = (v) => {
    if (!v) return null;
    // If v already a Date or ISO string
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    // normalize to start of day
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // ======= Filtered arrays based on date range (NEW) =======
  const { filteredPosSales, filteredAdminOrders, filteredTotals } = useMemo(() => {
    let start = filterStart ? parseToDay(filterStart) : null;
    let end = filterEnd ? parseToDay(filterEnd) : null;
    if (end) {
      // include the whole day
      end.setHours(23, 59, 59, 999);
    }

    const posByDate = (sale) => {
      const created = sale.createdAt ? new Date(sale.createdAt) : sale.date ? new Date(sale.date) : null;
      return created;
    };

    const orderRefDate = (o) => {
      // prefer deliveryDate, then updatedAt, then createdAt
      return new Date(o.deliveryDate || o.updatedAt || o.createdAt || null);
    };

    const posFiltered = posSales.filter((s) => {
      const d = posByDate(s);
      if (!d || !d.getTime()) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });

    const ordersFiltered = adminOrders.filter((o) => {
      const d = orderRefDate(o);
      if (!d || !d.getTime()) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });

    // compute totals
    const posSum = posFiltered.reduce((s, sale) => {
      const val = Number(sale.totals?.total ?? sale.total ?? 0) || 0;
      return s + val;
    }, 0);

    // For deliveries we compute revenue from items (delivered qty if present)
    const deliverySum = ordersFiltered.reduce((s, o) => {
      // Use items revenue
      const items = Array.isArray(o.items) ? o.items : [];
      const revenue = items.reduce((acc, it) => {
        const qty = Number(it.deliveredQty ?? it.quantity ?? it.qty ?? 0);
        const price = Number(it.price ?? 0);
        return acc + qty * price;
      }, 0);
      return s + revenue;
    }, 0);

    return {
      filteredPosSales: posFiltered,
      filteredAdminOrders: ordersFiltered,
      filteredTotals: {
        posSum,
        deliverySum,
        combined: posSum + deliverySum,
      },
    };
  }, [posSales, adminOrders, filterStart, filterEnd, productMap]);

  // ======= Helper: start of week (Mon) given a date =======
  const getStartOfWeekMonday = (d) => {
    const dt = new Date(d);
    const day = dt.getDay(); // 0=Sun,1=Mon...
    // calculate distance to Monday
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const monday = new Date(dt);
    monday.setDate(dt.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // ======= Compute Monday->Saturday totals for current week =======
  const weekDayTotals = useMemo(() => {
    // build an array of 6 days: Monday..Saturday for current week
    const now = new Date();
    const monday = getStartOfWeekMonday(now);
    const days = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }

    // helper to compare date (YYYY-MM-DD)
    const dateKey = (date) => date.toISOString().split("T")[0];

    // precompute POS map by date
    const posByDate = {};
    posSales.forEach((s) => {
      const created = s.createdAt ? new Date(s.createdAt) : s.date ? new Date(s.date) : null;
      if (!created) return;
      const key = dateKey(new Date(created.setHours(0, 0, 0, 0)));
      const val = Number(s.totals?.total ?? s.total ?? 0) || 0;
      posByDate[key] = (posByDate[key] || 0) + val;
    });

    // precompute deliveries by date (use updatedAt if completed, else deliveryDate/createdAt)
    const deliveryByDate = {};
    adminOrders.forEach((o) => {
      // only count completed orders for delivered revenue
      if (!o || (o.status && o.status.toLowerCase() !== "completed")) return;

      // choose reference date: prefer updatedAt, then deliveryDate, then createdAt
      let ref = o.updatedAt || o.deliveryDate || o.createdAt || null;
      if (!ref) return;
      ref = new Date(ref);
      const key = dateKey(new Date(ref.setHours(0, 0, 0, 0)));

      // sum revenue from items: use deliveredQty if present, else quantity
      const items = Array.isArray(o.items) ? o.items : [];
      const revenue = items.reduce((s, it) => {
        const qty = Number(it.deliveredQty ?? it.quantity ?? it.qty ?? 0);
        const price = Number(it.price ?? 0);
        return s + qty * price;
      }, 0);

      deliveryByDate[key] = (deliveryByDate[key] || 0) + revenue;
    });

    // build result array
    const result = days.map((d) => {
      const key = dateKey(d);
      const pos = posByDate[key] || 0;
      const delivery = deliveryByDate[key] || 0;
      const total = pos + delivery;
      return {
        date: key,
        display: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
        pos,
        delivery,
        total,
      };
    });

    return result;
  }, [posSales, adminOrders]);

  // ======= Monthly totals (current month) =======
  const monthlyTotals = useMemo(() => {
    const now = new Date();
    const month = now.getMonth(); // 0-based
    const year = now.getFullYear();
    const monthKeyMatch = (d) => {
      const dt = new Date(d);
      return dt.getMonth() === month && dt.getFullYear() === year;
    };

    // POS monthly sum
    const posMonth = posSales.reduce((s, sale) => {
      const created = sale.createdAt ? new Date(sale.createdAt) : sale.date ? new Date(sale.date) : null;
      if (!created) return s;
      if (!monthKeyMatch(created)) return s;
      return s + Number(sale.totals?.total ?? sale.total ?? 0);
    }, 0);

    // Delivery monthly sum (only completed orders)
    const deliveryMonth = adminOrders.reduce((s, order) => {
      if (!order || (order.status && order.status.toLowerCase() !== "completed")) return s;
      // pick a date to check month: updatedAt or deliveryDate or createdAt
      const ref = new Date(order.updatedAt || order.deliveryDate || order.createdAt || 0);
      if (!monthKeyMatch(ref)) return s;
      const items = Array.isArray(order.items) ? order.items : [];
      const revenue = items.reduce((acc, it) => {
        const qty = Number(it.deliveredQty ?? it.quantity ?? it.qty ?? 0);
        const price = Number(it.price ?? 0);
        return acc + qty * price;
      }, 0);
      return s + revenue;
    }, 0);

    return {
      posMonth,
      deliveryMonth,
      totalMonth: posMonth + deliveryMonth,
    };
  }, [posSales, adminOrders]);

  // ======= POS derived numbers (small summary) =======
  const posSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const salesToday = posSales.filter((s) => {
      const created = s.createdAt ? new Date(s.createdAt) : s.date ? new Date(s.date) : null;
      if (!created) return false;
      return created >= today;
    });
    const totalPosCount = posSales.length;
    const totalPosRevenue = posSales.reduce((s, sale) => {
      const sum = Number(sale.totals?.total ?? sale.total ?? 0) || 0;
      return s + sum;
    }, 0);

    const todayRevenue = salesToday.reduce((s, sale) => {
      const val = Number(sale.totals?.total ?? sale.total ?? 0) || 0;
      return s + val;
    }, 0);

    return { totalPosCount, totalPosRevenue, salesTodayCount: salesToday.length, todayRevenue, salesToday };
  }, [posSales]);

  // ======= Clear filter =======
  function clearFilter() {
    setFilterStart("");
    setFilterEnd("");
  }

  // ======= Resolve helper for dashboard items =======
  function resolveProductTitle(productId) {
    if (!productId && productId !== 0) return null;
    const key = String(productId);
    return productMap[key] ?? null;
  }

  return (
    <div className="p-6 space-y-10">
      {/* Dashboard top row: expenses + quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-md border">
          <h1 className="text-2xl font-semibold">💰 Store Expenses</h1>
          <div className="mt-3 text-sm text-gray-600">Current Total: <span className="text-blue-600">₱{totalCost}</span></div>
          <div className="mt-4">
            <Button onClick={handleSaveExpense} className="mt-4 w-full">Save Expense Entry</Button>
          </div>
        </div>

        {/* Dashboard summary tile (optional data from backend) */}
        <div className="bg-white p-5 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold">Daily Summary</h3>
          <div className="mt-3 text-sm text-gray-600">
            <div>Daily Target: <strong>{dashboardSummary?.dailyTarget ?? "200"} gallons</strong></div>
            <div>Delivered Today: <strong>{dashboardSummary?.totalDeliveredToday ?? "—"}</strong></div>
            <div>Total Stock: <strong>{dashboardSummary?.totalStock ?? "—"}</strong></div>
          </div>
        </div>

        {/* Walk-in (POS) summary */}
        <div className="bg-white p-5 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold">Walk-in Sales (POS)</h3>
          <div className="mt-3 text-sm text-gray-600">
            <div>Total Walk-ins: <strong>{posSummary.totalPosCount}</strong></div>
            <div>Sales Today: <strong>{posSummary.salesTodayCount}</strong></div>
            <div>Revenue Today: <strong>₱{posSummary.todayRevenue.toFixed(2)}</strong></div> 
            <div className="mt-2 text-xs text-gray-500">Total POS Revenue: ₱{posSummary.totalPosRevenue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Date range filter UI */}
      <div className="bg-white p-4 rounded-lg shadow-md border">
        <h3 className="text-lg font-semibold mb-3">Filter Sales by Date Range</h3>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div>
            <label className="text-sm block mb-1">Start date</label>
            <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="border rounded px-2 py-1" />
          </div>

          <div>
            <label className="text-sm block mb-1">End date</label>
            <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="border rounded px-2 py-1" />
          </div>

          <div className="mt-4 md:mt-0 flex gap-2 ml-auto">
            <Button onClick={clearFilter} variant="outline">Clear</Button>
          </div>
        </div>

        {/* Filter summary */}
        <div className="mt-3 text-sm text-gray-600">
          <div>POS Total (filtered): <strong>₱{filteredTotals.posSum.toFixed(2)}</strong></div>
          <div>Delivery Total (filtered): <strong>₱{filteredTotals.deliverySum.toFixed(2)}</strong></div>
          <div className="font-bold mt-1">Combined (filtered): <strong>₱{filteredTotals.combined.toFixed(2)}</strong></div>
        </div>
      </div>

      {/* 6-day (Mon-Sat) totals */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-3">Weekly (Mon–Sat) Sales</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {weekDayTotals.map((d) => (
            <div key={d.date} className="p-3 rounded border bg-gray-50">
              <div className="text-sm text-gray-600">{d.display}</div>
              <div className="mt-2 text-lg font-bold">₱{d.total.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">
                Delivery: ₱{d.delivery.toFixed(2)} • POS: ₱{d.pos.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly totals */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-3">Monthly Totals (This Month)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded border bg-gray-50">
            <div className="text-sm text-gray-600">Delivery Revenue</div>
            <div className="mt-2 text-lg font-bold">₱{monthlyTotals.deliveryMonth.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded border bg-gray-50">
            <div className="text-sm text-gray-600">POS Revenue</div>
            <div className="mt-2 text-lg font-bold">₱{monthlyTotals.posMonth.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded border bg-gray-50">
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="mt-2 text-lg font-bold">₱{monthlyTotals.totalMonth.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Recent Walk-in Sales list (filtered view) */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Recent Walk-in Sales (Filtered)</h2>
          <div className="text-sm text-gray-500">{posLoading ? "Loading…" : `${filteredPosSales.length} shown`}</div>
        </div>

        {filteredPosSales.length === 0 ? (
          <p className="text-gray-500">No walk-in sales in this range.</p>
        ) : (
          <ul className="space-y-3">
            {filteredPosSales.slice(0, 50).map((sale) => (
              <li key={sale._id || sale.id} className="p-3 rounded-md bg-gray-50 border flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>{sale.customer?.name || sale.customer?.customerName || "Walk-in Customer"}</strong>
                    <span className="ml-3 text-xs text-gray-400">{new Date(sale.createdAt || sale.date || Date.now()).toLocaleString()}</span>
                  </div>

                  <div className="text-sm text-gray-700">
                    {Array.isArray(sale.items) ? sale.items.map((it) => `${it.name || it.productName || "Item"} x${it.qty || it.quantity || 0}`).join(" • ") : ""}
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

      {/* Recent Delivery Orders (filtered) */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Delivery Orders (Filtered)</h2>
          <div className="text-sm text-gray-500">{ordersLoading ? "Loading…" : `${filteredAdminOrders.length} shown`}</div>
        </div>

        {filteredAdminOrders.length === 0 ? (
          <p className="text-gray-500">No delivery orders in this range.</p>
        ) : (
          // <-- SCROLLABLE container applied ONLY to Delivery Orders list
          <div className="max-h-[320px] overflow-auto pr-2">
            <ul className="space-y-3">
              {filteredAdminOrders.slice(0, 50).map((order) => (
                <li key={order._id} className="p-3 rounded-md bg-gray-50 border flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">
                      <strong>{order.customerId?.fullName || "Customer"}</strong>
                      <span className="ml-3 text-xs text-gray-400">
                        {new Date(order.deliveryDate || order.updatedAt || order.createdAt || Date.now()).toLocaleString()}
                      </span>
                    </div>

                    {/* Items: vertical list, resolve productId -> title using productMap */}
                    <div className="text-sm text-gray-700">
                      {Array.isArray(order.items) && order.items.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {order.items.map((it, i) => {
                            // resolve title: try productId then fallback to embedded fields
                            const prodId = it.productId ?? (typeof it.product === "string" ? it.product : it.product?._id ?? null);
                            const titleFromMap = prodId ? resolveProductTitle(prodId) : null;
                            const embedded = it.productName ?? it.name ?? it.title ?? (it.product && (it.product.title ?? it.product.name)) ?? null;
                            const displayName = titleFromMap || embedded || `productId:${prodId ?? "?"}`;
                            const qty = it.quantity ?? it.qty ?? 0;
                            return (
                              <div key={i} className="truncate">
                                {displayName} ×{qty}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        ""
                      )}
                    </div>
                  </div>

                  <div className="ml-4 text-right">
                    {/* compute order revenue quickly */}
                    <div className="font-semibold">
                      ₱{(Array.isArray(order.items) ? order.items.reduce((s, it) => s + (Number(it.price ?? 0) * Number(it.quantity ?? it.qty ?? 0)), 0) : 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">{order.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* MONTHLY CARDS (expenses UI remains unchanged) */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Expense Summary by Month</h2>
          <div className="text-sm text-gray-500">All saved values are normalized to weekly</div>
        </div>

        {groupedByMonth.length === 0 ? (
          <p className="text-gray-500">No expenses recorded yet.</p>
        ) : (
          groupedByMonth.map((group) => {
            const isCollapsed = collapsedMonths[group.month];
            return (
              <div key={group.month} className="p-4 border rounded-lg shadow-sm mb-5 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-1">{group.month}</h3>
                    <p className="text-blue-600 font-semibold text-xl">
                      Total: ₱{Math.round(group.monthlyTotal * 100) / 100}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => printMonth(group)}>Print PDF</Button>
                    <Button variant="outline" size="sm" onClick={() => exportMonthToExcel(group)}>Export Excel</Button>
                    <Button variant="secondary" size="sm" onClick={() => toggleMonth(group.month)}>
                      {isCollapsed ? "Show" : "Hide"}
                    </Button>
                  </div>
                </div>

                {!isCollapsed && (
                  <ul className="mt-3 space-y-3">
                    {group.entries.map((entry) => {
                      const entryTotal =
                        Number(entry.electric || 0) +
                        Number(entry.water || 0) +
                        Number(entry.gas || 0) +
                        Number(entry.other || 0);

                      return (
                        <li key={entry.id} className="p-3 rounded-md bg-white border flex justify-between items-start">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">
                              <strong>{new Date(entry.dateISO).toLocaleString()}</strong>
                              {" — "}({entry.inputDuration})
                            </div>

                            {editingEntryId === entry.id ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    className="border p-1 rounded w-24"
                                    value={editingValues.electric}
                                    onChange={(e) =>
                                      setEditingValues((prev) => ({ ...prev, electric: e.target.value }))
                                    }
                                  />
                                  <input
                                    type="number"
                                    className="border p-1 rounded w-24"
                                    value={editingValues.water}
                                    onChange={(e) =>
                                      setEditingValues((prev) => ({ ...prev, water: e.target.value }))
                                    }
                                  />
                                  <input
                                    type="number"
                                    className="border p-1 rounded w-24"
                                    value={editingValues.gas}
                                    onChange={(e) =>
                                      setEditingValues((prev) => ({ ...prev, gas: e.target.value }))
                                    }
                                  />
                                  <input
                                    type="number"
                                    className="border p-1 rounded w-24"
                                    value={editingValues.other}
                                    onChange={(e) =>
                                      setEditingValues((prev) => ({ ...prev, other: e.target.value }))
                                    }
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setExpenseHistory((prev) =>
                                        prev.map((it) =>
                                          it.id === entry.id
                                            ? {
                                                ...it,
                                                electric: Number(editingValues.electric),
                                                water: Number(editingValues.water),
                                                gas: Number(editingValues.gas),
                                                other: Number(editingValues.other),
                                              }
                                            : it
                                        )
                                      );
                                      setEditingEntryId(null);
                                    }}
                                  >
                                    Save
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingEntryId(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-700">
                                Electric: ₱{entry.electric} • Water: ₱{entry.water} • Gas: ₱{entry.gas} • Other: ₱{entry.other}
                                <div className="mt-1 font-semibold">Total (weekly-normalized): ₱{entryTotal}</div>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="mt-2"
                                  onClick={() => {
                                    setEditingEntryId(entry.id);
                                    setEditingValues({
                                      electric: entry.electric,
                                      water: entry.water,
                                      gas: entry.gas,
                                      other: entry.other,
                                    });
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FEATURE IMAGE UPLOAD */}
      <div>
        <ProductImageUpload
          imageFile={imageFile}
          setImageFile={setImageFile}
          uploadedImageUrl={uploadedImageUrl}
          setUploadedImageUrl={setUploadedImageUrl}
          setImageLoadingState={setImageLoadingState}
          imageLoadingState={imageLoadingState}
          isCustomStyling={true}
        />
        <Button onClick={handleUploadFeatureImage} className="mt-5 w-full">
          Upload
        </Button>

        <div className="flex flex-col gap-4 mt-5">
          {featureImageList?.length > 0 ? (
            featureImageList.map((img) => (
              <div key={img._id} className="relative group">
                <img src={img.image} className="w-full h-[300px] object-cover rounded-lg" />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                  onClick={() => handleDeleteImage(img._id)}
                >
                  Delete
                </Button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center">No feature images uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
