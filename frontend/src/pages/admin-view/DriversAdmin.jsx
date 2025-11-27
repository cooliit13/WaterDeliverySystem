// src/pages/admin-view/DriversAdmin.jsx
import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function DriversAdmin() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/admin/drivers");
      const list = Array.isArray(data) ? data : data?.drivers || [];
      setDrivers(list);
    } catch (err) {
      setError(err.message || "Failed to fetch drivers");
    } finally {
      setLoading(false);
    }
  }

  function resolveName(d) {
    if (d?.name) return d.name;

    const first = d?.firstname || "";
    const last = d?.lastname || "";
    const full = `${first} ${last}`.trim();

    return full || "No name";
  }

  async function toggleStatus(driver) {
    const driverId = driver?.id || driver?._id;
    if (!driverId) return;

    setTogglingId(driverId);

    try {
      const newStatus = driver.status === "active" ? "inactive" : "active";

      await apiFetch(`/api/admin/drivers/${driverId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      setDrivers((prev) =>
        prev.map((d) => {
          const id = d?.id || d?._id;
          return id === driverId ? { ...d, status: newStatus } : d;
        })
      );
    } catch (err) {
      setError(err.message || "Failed to update driver status");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Drivers</h2>

      {error && <div className="text-red-600 mb-3">{error}</div>}

      {loading ? (
        <p>Loading drivers...</p>
      ) : (
        <div className="border rounded overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {drivers.length > 0 ? (
                drivers.map((d, index) => {
                  const id = d?.id || d?._id || index;
                  return (
                    <tr key={id} className="border-b">
                      <td className="p-3">{resolveName(d)}</td>
                      <td className="p-3">{d?.phone || "-"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            d?.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {d?.status || "inactive"}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          className="px-3 py-1 border rounded"
                          onClick={() => toggleStatus(d)}
                          disabled={togglingId === id}
                        >
                          {togglingId === id
                            ? "Updating..."
                            : d?.status === "active"
                              ? "Disable"
                              : "Enable"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-4">
                    No drivers found.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      )}
    </div>
  );
}
