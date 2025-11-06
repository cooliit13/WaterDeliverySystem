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

  return (
    <div className="p-6 space-y-10">
      {/* EXPENSE INPUT */}
      <div className="bg-white p-5 rounded-lg shadow-md border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">💰 Store Expenses</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <input
            type="number"
            placeholder="Electricity Cost"
            className="border p-2 rounded"
            value={electric}
            onChange={(e) => setElectric(e.target.value)}
          />
          <input
            type="number"
            placeholder="Water Cost"
            className="border p-2 rounded"
            value={water}
            onChange={(e) => setWater(e.target.value)}
          />
          <input
            type="number"
            placeholder="Gas Fuel Cost"
            className="border p-2 rounded"
            value={gas}
            onChange={(e) => setGas(e.target.value)}
          />
          <input
            type="number"
            placeholder="Other Expenses"
            className="border p-2 rounded"
            value={other}
            onChange={(e) => setOther(e.target.value)}
          />
        </div>

        <div className="mt-4 flex items-center gap-4">
          <label className="font-medium">Input Duration:</label>
          <select
            className="border p-2 rounded"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            <option value="weekly">Weekly (values saved as weekly)</option>
            <option value="monthly">Monthly (will be divided by 4 and saved as weekly)</option>
          </select>

          <div className="ml-auto text-lg font-bold">
            Current Total: <span className="text-blue-600">₱{totalCost}</span>
          </div>
        </div>

        <Button onClick={handleSaveExpense} className="mt-4 w-full">
          Save Expense Entry
        </Button>
      </div>

      {/* MONTHLY CARDS */}
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
