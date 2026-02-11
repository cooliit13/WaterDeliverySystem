// AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProductImageUpload from "@/components/admin-view/image-upload";
import Archives from "./Archives";
import { Button } from "@/components/ui/button";
import {
  addFeatureImage,
  getFeatureImages,
  deleteFeatureImage,
} from "@/store/common-slice";

import * as XLSX from "xlsx";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import AcquaLogo from "@/assets/pictures/LOGO/AcquaLogo.png";

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

  // ======= POD gallery state (minimal) =======
  const [podGalleryOpen, setPodGalleryOpen] = useState(false);
  const [podGalleryUrls, setPodGalleryUrls] = useState([]);
  const [podGalleryIndex, setPodGalleryIndex] = useState(0);

  // ======= Show/hide control for walk-in sales list =======
  const [showAllPosSales, setShowAllPosSales] = useState(false);
  const POS_VISIBLE_COUNT = 5;

  // ======= Archives state (persisted to localStorage) =======
  const [archives, setArchives] = useState(() => {
    try {
      const raw = localStorage.getItem("adminArchives");
      return raw
        ? JSON.parse(raw)
        : { posSales: [], adminOrders: [], expenseMonths: [] };
    } catch {
      return { posSales: [], adminOrders: [], expenseMonths: [] };
    }
  });

  // Persist archives to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem("adminArchives", JSON.stringify(archives));
    } catch (e) {
      console.error("Failed to persist archives", e);
    }
  }, [archives]);

  // Control Archives modal visibility (parent-controlled)
  const [archivesOpen, setArchivesOpen] = useState(false);

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

  // ======= Generate Weekly PDF (with logo) =======
  function generateWeeklyPdf() {
    const rowsHtml = weekDayTotals
      .map(
        (d) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${d.display}</td>
        <td style="padding:8px;border:1px solid #ddd">₱${d.pos.toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #ddd">₱${d.delivery.toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #ddd">₱${d.total.toFixed(2)}</td>
      </tr>`
      )
      .join("");

    const grandPos = weekDayTotals.reduce((s, x) => s + x.pos, 0);
    const grandDelivery = weekDayTotals.reduce((s, x) => s + x.delivery, 0);
    const grandTotal = weekDayTotals.reduce((s, x) => s + x.total, 0);

    const htmlContent = `
      <html>
        <head>
          <title>Weekly Sales Summary (Mon–Sat)</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
            h1 { font-size: 22px; margin-bottom: 10px; text-align:center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background: #f5f5f5; }
            tfoot td { font-weight: bold; background: #fafafa; }
            .logo { width: 120px; display:block; margin:0 auto 10px auto; }
          </style>
        </head>
        <body>

          <img src="${AcquaLogo}" class="logo" />
          <h1>Weekly Sales Summary (Mon–Sat)</h1>
          <p style="text-align:center;"> ${new Date().toLocaleString()}</p>

          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>POS</th>
                <th>Delivery</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td>Grand Total</td>
                <td>₱${grandPos.toFixed(2)}</td>
                <td>₱${grandDelivery.toFixed(2)}</td>
                <td>₱${grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (!w) return alert("Pop-up blocked. Allow pop-ups to print PDF.");
    w.document.write(htmlContent);
    w.document.close();
    w.print();
  }

  // ======= Generate Monthly PDF (with logo) =======
  function generateMonthlyPdf() {
    const now = new Date();
    const monthLabel = now.toLocaleString(undefined, { month: "long", year: "numeric" });

    const htmlContent = `
      <html>
        <head>
          <title>Monthly Totals — ${monthLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
            h1 { text-align:center; font-size: 22px; margin-bottom: 10px; }
            .logo { width: 120px; display:block; margin:0 auto 10px auto; }
            .card { border:1px solid #e6e6e6; padding:20px; border-radius:8px; margin-top:20px; }
            .row { display:flex; justify-content:space-between; margin-bottom:10px; }
            .label { color:#555; }
            .value { font-weight:700; font-size:1.1rem; }
          </style>
        </head>
        <body>

          <img src="${AcquaLogo}" class="logo" />
          <h1>Monthly Sales Report — ${monthLabel}</h1>
          <p style="text-align:center;"> ${new Date().toLocaleString()}</p>

          <div class="card">
            <div class="row"><div class="label">Delivery Revenue</div><div class="value">₱${monthlyTotals.deliveryMonth.toFixed(2)}</div></div>
            <div class="row"><div class="label">POS Revenue</div><div class="value">₱${monthlyTotals.posMonth.toFixed(2)}</div></div>
            <div class="row"><div class="label">Total Revenue</div><div class="value">₱${monthlyTotals.totalMonth.toFixed(2)}</div></div>
          </div>

        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (!w) return alert("Pop-up blocked. Allow pop-ups to print PDF.");
    w.document.write(htmlContent);
    w.document.close();
    w.print();
  }

  // ======= Archive helpers =======
  function archivePosSale(id) {
    setPosSales((prev) => {
      const item = prev.find((p) => (p._id || p.id) === id);
      if (!item) return prev;
      setArchives((a) => ({ ...a, posSales: [item, ...a.posSales] }));
      return prev.filter((p) => (p._id || p.id) !== id);
    });
  }

  function restorePosSale(item) {
    setPosSales((prev) => [item, ...prev]);
    setArchives((a) => ({ ...a, posSales: a.posSales.filter((p) => (p._id || p.id) !== (item._id || item.id)) }));
  }

  function deleteArchivedPosSale(id) {
    setArchives((a) => ({ ...a, posSales: a.posSales.filter((p) => (p._id || p.id) !== id) }));
  }

  function archiveOrder(id) {
    setAdminOrders((prev) => {
      const item = prev.find((o) => (o._id || o.id) === id);
      if (!item) return prev;
      setArchives((a) => ({ ...a, adminOrders: [item, ...a.adminOrders] }));
      return prev.filter((o) => (o._id || o.id) !== id);
    });
  }

  function restoreOrder(item) {
    setAdminOrders((prev) => [item, ...prev]);
    setArchives((a) => ({ ...a, adminOrders: a.adminOrders.filter((o) => (o._id || o.id) !== (item._id || item.id)) }));
  }

  function deleteArchivedOrder(id) {
    setArchives((a) => ({ ...a, adminOrders: a.adminOrders.filter((o) => (o._id || o.id) !== id) }));
  }

  function archiveExpenseMonth(monthKey) {
    const group = groupedByMonth.find((g) => g.month === monthKey);
    if (!group) return;
    setExpenseHistory((prev) => prev.filter((e) => {
      const d = new Date(e.dateISO);
      const mk = d.toLocaleString("default", { month: "long", year: "numeric" });
      return mk !== monthKey;
    }));
    setArchives((a) => ({ ...a, expenseMonths: [group, ...a.expenseMonths] }));
  }

  function restoreExpenseMonth(group) {
    setExpenseHistory((prev) => {
      const restored = [...group.entries, ...prev];
      restored.sort((x, y) => new Date(y.dateISO) - new Date(x.dateISO));
      return restored;
    });
    setArchives((a) => ({ ...a, expenseMonths: a.expenseMonths.filter((g) => g.month !== group.month) }));
  }

  function deleteArchivedExpenseMonth(monthKey) {
    setArchives((a) => ({ ...a, expenseMonths: a.expenseMonths.filter((g) => g.month !== monthKey) }));
  }

  // ======= NEW: Fetch POS, dashboard summary, admin orders =======
  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

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

    axios
      .get("http://localhost:5000/api/admin/dashboard/summary", { headers })
      .then((res) => {
        if (res.data?.success) setDashboardSummary(res.data);
      })
      .catch(() => {});

    setOrdersLoading(true);
    axios
      .get("http://localhost:5000/api/admin/orders/get", { headers })
      .then(async (res) => {
        const orders = res.data?.orders ?? res.data ?? [];
        setAdminOrders(Array.isArray(orders) ? orders : []);

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
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // ======= Filtered arrays based on date range (NEW) =======
  const { filteredPosSales, filteredAdminOrders, filteredTotals } = useMemo(() => {
    let start = filterStart ? parseToDay(filterStart) : null;
    let end = filterEnd ? parseToDay(filterEnd) : null;
    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    const posByDate = (sale) => {
      const created = sale.createdAt ? new Date(sale.createdAt) : sale.date ? new Date(sale.date) : null;
      return created;
    };

    const orderRefDate = (o) => {
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

    const posSum = posFiltered.reduce((s, sale) => {
      const val = Number(sale.totals?.total ?? sale.total ?? 0) || 0;
      return s + val;
    }, 0);

    const deliverySum = ordersFiltered.reduce((s, o) => {
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
    const day = dt.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const monday = new Date(dt);
    monday.setDate(dt.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // ======= Compute Monday->Saturday totals for current week =======
  const weekDayTotals = useMemo(() => {
    const now = new Date();
    const monday = getStartOfWeekMonday(now);
    const days = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }

    const dateKey = (date) => date.toISOString().split("T")[0];

    const posByDate = {};
    posSales.forEach((s) => {
      const created = s.createdAt ? new Date(s.createdAt) : s.date ? new Date(s.date) : null;
      if (!created) return;
      const key = dateKey(new Date(created.setHours(0, 0, 0, 0)));
      const val = Number(s.totals?.total ?? s.total ?? 0) || 0;
      posByDate[key] = (posByDate[key] || 0) + val;
    });

    const deliveryByDate = {};
    adminOrders.forEach((o) => {
      if (!o || (o.status && o.status.toLowerCase() !== "completed")) return;
      let ref = o.updatedAt || o.deliveryDate || o.createdAt || null;
      if (!ref) return;
      ref = new Date(ref);
      const key = dateKey(new Date(ref.setHours(0, 0, 0, 0)));
      const items = Array.isArray(o.items) ? o.items : [];
      const revenue = items.reduce((s, it) => {
        const qty = Number(it.deliveredQty ?? it.quantity ?? it.qty ?? 0);
        const price = Number(it.price ?? 0);
        return s + qty * price;
      }, 0);
      deliveryByDate[key] = (deliveryByDate[key] || 0) + revenue;
    });

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
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthKeyMatch = (d) => {
      const dt = new Date(d);
      return dt.getMonth() === month && dt.getFullYear() === year;
    };

    const posMonth = posSales.reduce((s, sale) => {
      const created = sale.createdAt ? new Date(sale.createdAt) : sale.date ? new Date(sale.date) : null;
      if (!created) return s;
      if (!monthKeyMatch(created)) return s;
      return s + Number(sale.totals?.total ?? sale.total ?? 0);
    }, 0);

    const deliveryMonth = adminOrders.reduce((s, order) => {
      if (!order || (order.status && order.status.toLowerCase() !== "completed")) return s;
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

  // ======= Minimal helper: return array of POD URLs (deduped) =======
  const findOrderProofImages = (order) => {
    if (!order) return [];
    const urls = [];

    const push = (v) => {
      if (!v) return;
      if (typeof v === "string" && v.trim()) urls.push(v.trim());
      else if (v?.image && typeof v.image === "string") urls.push(v.image.trim());
      else if (v?.url && typeof v.url === "string") urls.push(v.url.trim());
    };

    push(order.proofOfDelivery);
    push(order.proofImage);
    push(order.deliveryProof);
    if (Array.isArray(order.deliveryProofs)) order.deliveryProofs.forEach((p) => push(p?.image ?? p?.url ?? p));
    if (Array.isArray(order.photos)) order.photos.forEach((p) => push(p));
    if (Array.isArray(order.images)) order.images.forEach((p) => push(p));
    if (Array.isArray(order.pictures)) order.pictures.forEach((p) => push(p));

    if (Array.isArray(order.items)) {
      order.items.forEach((it) => {
        if (!it) return;
        push(it.proofImage ?? it.deliveryProof ?? it.photo ?? it.image ?? it.url);
        if (Array.isArray(it.photos)) it.photos.forEach((p) => push(p));
      });
    }

    return Array.from(new Set(urls)).filter(Boolean);
  };

  // ======= gallery control helpers =======
  const openPodGallery = (urls = [], startIndex = 0) => {
    if (!Array.isArray(urls) || urls.length === 0) return;
    setPodGalleryUrls(urls);
    setPodGalleryIndex(Math.max(0, Math.min(startIndex, urls.length - 1)));
    setPodGalleryOpen(true);
  };

  const closePodGallery = () => {
    setPodGalleryOpen(false);
    setPodGalleryUrls([]);
    setPodGalleryIndex(0);
  };

  // keyboard support for gallery
  useEffect(() => {
    if (!podGalleryOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closePodGallery();
      if (e.key === "ArrowLeft") setPodGalleryIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setPodGalleryIndex((i) => Math.min(podGalleryUrls.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [podGalleryOpen, podGalleryUrls.length]);

  // ======= Current form total =======
  const totalCost = useMemo(() => {
    return (
      Number(electric || 0) +
      Number(water || 0) +
      Number(gas || 0) +
      Number(other || 0)
    );
  }, [electric, water, gas, other]);

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

        <div className="bg-white p-5 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold">Daily Summary</h3>
          <div className="mt-3 text-sm text-gray-600">
            <div>Daily Target: <strong>{dashboardSummary?.dailyTarget ?? "200"} gallons</strong></div>
            <div>Delivered Today: <strong>{dashboardSummary?.totalDeliveredToday ?? "—"}</strong></div>
            <div>Total Stock: <strong>{dashboardSummary?.totalStock ?? "—"}</strong></div>
          </div>
        </div>

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

        <div className="mt-3 text-sm text-gray-600">
          <div>POS Total (filtered): <strong>₱{filteredTotals.posSum.toFixed(2)}</strong></div>
          <div>Delivery Total (filtered): <strong>₱{filteredTotals.deliverySum.toFixed(2)}</strong></div>
          <div className="font-bold mt-1">Combined (filtered): <strong>₱{filteredTotals.combined.toFixed(2)}</strong></div>
        </div>
      </div>

      {/* 6-day (Mon-Sat) totals */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-3">Weekly (Mon–Sat) Sales</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generateWeeklyPdf}>Generate PDF</Button>
          </div>
        </div>

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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-3">Monthly Totals (This Month)</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generateMonthlyPdf}>Generate PDF</Button>
          </div>
        </div>

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

      {/* Recent Walk-in Sales list (filtered view) with Show/Hide and Archive */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Recent Walk-in Sales (Filtered)</h2>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">{posLoading ? "Loading…" : `${filteredPosSales.length} shown`}</div>
          </div>
        </div>

        {filteredPosSales.length === 0 ? (
          <p className="text-gray-500">No walk-in sales in this range.</p>
        ) : (
          <>
            <ul className="space-y-3">
              {filteredPosSales
                .slice(0, showAllPosSales ? filteredPosSales.length : POS_VISIBLE_COUNT)
                .map((sale) => (
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

                    <div className="ml-4 text-right flex flex-col items-end">
                      <div className="font-semibold">₱{(sale.totals?.total ?? sale.total ?? 0).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{sale.note || ""}</div>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => archivePosSale(sale._id || sale.id)}>Archive</Button>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>

            {filteredPosSales.length > POS_VISIBLE_COUNT && (
              <div className="mt-3 flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAllPosSales((v) => !v)}
                >
                  {showAllPosSales ? "Hide" : `Show more (${filteredPosSales.length - POS_VISIBLE_COUNT})`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Delivery Orders (filtered) with Archive */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Delivery Orders (Filtered)</h2>
          <div className="text-sm text-gray-500">{ordersLoading ? "Loading…" : `${filteredAdminOrders.length} shown`}</div>
        </div>

        {filteredAdminOrders.length === 0 ? (
          <p className="text-gray-500">No delivery orders in this range.</p>
        ) : (
          <div className="max-h-[320px] overflow-auto pr-2">
            <ul className="space-y-3">
              {filteredAdminOrders.slice(0, 50).map((order) => {
                const proofUrls = findOrderProofImages(order);
                const proofUrl = proofUrls.length > 0 ? proofUrls[0] : null;

                return (
                  <li key={order._id} className="p-3 rounded-md bg-gray-50 border flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">
                        <strong>{order.customerId?.fullName || "Customer"}</strong>
                        <span className="ml-3 text-xs text-gray-400">
                          {new Date(order.deliveryDate || order.updatedAt || order.createdAt || Date.now()).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-sm text-gray-700">
                        {Array.isArray(order.items) && order.items.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {order.items.map((it, i) => {
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

                    <div className="ml-4 text-right flex flex-col items-end">
                      <div className="font-semibold">
                        ₱{(Array.isArray(order.items) ? order.items.reduce((s, it) => s + (Number(it.price ?? 0) * Number(it.quantity ?? it.qty ?? 0)), 0) : 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">{order.status}</div>

                      {proofUrl && (
                        <img
                          src={proofUrl}
                          alt="POD thumbnail"
                          className="w-[80px] h-[80px] object-cover rounded border mt-2 cursor-pointer"
                          onClick={() => openPodGallery(proofUrls, 0)}
                          onError={(e) => { e.currentTarget.style.opacity = 0.6; }}
                          title="Click to open POD gallery"
                        />
                      )}

                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => openPodGallery(proofUrls, 0)}>Show POD</Button>
                        <Button size="sm" variant="outline" onClick={() => archiveOrder(order._id || order.id)}>Archive</Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* MONTHLY CARDS (expenses) with Archive */}
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
                    <Button size="sm" variant="outline" onClick={() => archiveExpenseMonth(group.month)}>Archive</Button>
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

      {/* Minimal POD gallery modal */}
      {podGalleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPodGalleryOpen(false)}
        >
          <div className="bg-white rounded-lg max-w-[95%] max-h-[95%] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Proof of Delivery</h3>
                <div className="text-sm text-gray-500">{podGalleryIndex + 1} / {podGalleryUrls.length}</div>
              </div>

              <div className="flex items-center gap-2">
                <a href={podGalleryUrls[podGalleryIndex]} target="_blank" rel="noreferrer" className="text-sm underline">Open in new tab</a>
                <a href={podGalleryUrls[podGalleryIndex]} download className="text-sm underline">Download</a>
                <Button size="sm" variant="outline" onClick={() => setPodGalleryOpen(false)}>Close</Button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center" style={{ minHeight: 400 }}>
              <button
                type="button"
                onClick={() => setPodGalleryIndex((i) => Math.max(0, i - 1))}
                className="px-3 py-2 rounded hover:bg-gray-100"
                aria-label="Previous"
                disabled={podGalleryIndex === 0}
              >
                ◀
              </button>

              <div className="mx-4 flex-1 flex items-center justify-center">
                <img src={podGalleryUrls[podGalleryIndex]} alt={`POD ${podGalleryIndex + 1}`} className="max-h-[70vh] object-contain" />
              </div>

              <button
                type="button"
                onClick={() => setPodGalleryIndex((i) => Math.min(podGalleryUrls.length - 1, i + 1))}
                className="px-3 py-2 rounded hover:bg-gray-100"
                aria-label="Next"
                disabled={podGalleryUrls.length - 1 === podGalleryIndex}
              >
                ▶
              </button>
            </div>

            {podGalleryUrls.length > 1 && (
              <div className="p-2 border-t overflow-x-auto whitespace-nowrap">
                {podGalleryUrls.map((u, i) => (
                  <img
                    key={u + i}
                    src={u}
                    alt={`thumb-${i}`}
                    onClick={() => setPodGalleryIndex(i)}
                    className={`inline-block w-20 h-20 object-cover rounded m-1 cursor-pointer border ${i === podGalleryIndex ? "ring-2 ring-blue-500" : ""}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ARCHIVES area (parent-controlled modal) */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold">Archives</h2>
            <div className="text-sm text-gray-500">Restored items will reappear in their sections</div>
          </div>

          <div className="flex items-center gap-2">
            {/* Button to open the modal */}
            <Button size="sm" variant="outline" onClick={() => setArchivesOpen(true)}>
              Open Archives
            </Button>
          </div>
        </div>

        {/* Pass isOpen and onClose to child */}
        <Archives
          isOpen={archivesOpen}
          onClose={() => setArchivesOpen(false)}
          archives={archives}
          onRestorePos={restorePosSale}
          onDeletePos={deleteArchivedPosSale}
          onRestoreOrder={restoreOrder}
          onDeleteOrder={deleteArchivedOrder}
          onRestoreExpenseMonth={restoreExpenseMonth}
          onDeleteExpenseMonth={deleteArchivedExpenseMonth}
        />
      </div>
    </div>
  );
}

export default AdminDashboard;
