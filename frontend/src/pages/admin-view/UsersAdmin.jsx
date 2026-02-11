// src/pages/admin-view/UsersAdmin.jsx
import { useEffect, useState } from "react";
import { Edit2 } from "lucide-react";

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/admin/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to fetch users (status ${res.status})`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.users ?? [];
      setUsers(list);
    } catch (err) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }

  function resolveName(user) {
    if (!user) return "No name";
    if (user.fullName && user.fullName.trim() !== "") return user.fullName.trim();
    const first = user.firstname?.trim() || "";
    const last = user.lastname?.trim() || "";
    const full = `${first} ${last}`.trim();
    if (full) return full;
    if (user.name && user.name.trim() !== "") return user.name.trim();
    if (user.username && user.username.trim() !== "") return user.username.trim();
    if (user.email && user.email.trim() !== "") return user.email.trim();
    return "No name";
  }

  function startEditing(user) {
    const id = user?.id || user?._id;
    setEditingUserId(id);
    setNewRole(user?.role || "user");
    setError(null);
  }

  async function saveRole(userId) {
    setError(null);
    try {
      // find the current user object from state to read updatedAt
      const userObj = users.find((u) => (u.id || u._id) === userId);
      const clientUpdatedAt = userObj?.updatedAt ?? null;

      const payload = { role: newRole, clientUpdatedAt };

      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 200 && data?.user) {
        // success — update local state
        setUsers((prev) => prev.map((u) => ((u.id || u._id) === userId ? data.user : u)));
        setEditingUserId(null);
        setNewRole("");
      } else if (res.status === 429) {
        // Cooldown: server includes waitSeconds, updatedBy (name) and latest user
        const who = data?.updatedBy || (data?.user?.updatedBy?.name) || "Another admin";
        const secondsLeft = data?.waitSeconds ?? null;
        // update local user with latest from server so the UI shows the changed values
        if (data?.user) {
          setUsers((prev) => prev.map((u) => ((u.id || u._id) === userId ? data.user : u)));
        }
        setEditingUserId(null);
        setNewRole("");
        setError(`${who} edited this ${data?.user ? " — view updated" : ""}. Please wait ${secondsLeft ?? "a moment"} before retrying.`);
      } else if (res.status === 409) {
        // Conflict: another admin changed the user — server returns latest user
        if (data?.user) {
          setUsers((prev) => prev.map((u) => ((u.id || u._id) === userId ? data.user : u)));
        }
        setEditingUserId(null);
        setNewRole("");
        setError("Conflict: another admin changed this user. View updated with latest values.");
      } else {
        setError(data?.message || `Failed to save role (status ${res.status})`);
      }
    } catch (err) {
      setError(err.message || "Failed to save role");
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Users</h2>

      {error && <div className="text-red-600 mb-3">{error}</div>}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="border rounded overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {users.length > 0 ? (
                users.map((user, index) => {
                  const id = user?.id || user?._id || index;
                  return (
                    <tr key={id} className="border-b">
                      <td className="p-3">{resolveName(user)}</td>
                      <td className="p-3">{user?.email || "-"}</td>

                      <td className="p-3">
                        {editingUserId === id ? (
                          <select
                            className="border p-1 rounded"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                          >
                            <option value="user">Customer</option>
                            <option value="admin">Admin</option>
                            <option value="driver">Driver</option>
                            <option value="manager">Manager</option>
                          </select>
                        ) : (
                          user?.role === "user" ? "Customer" : user?.role || "Customer"
                        )}
                      </td>

                      <td className="p-3">
                        {editingUserId === id ? (
                          <button
                            className="px-3 py-1 bg-blue-600 text-white rounded"
                            onClick={() => saveRole(id)}
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            className="flex items-center gap-2 px-3 py-1 border rounded hover:bg-gray-100"
                            onClick={() => startEditing(user)}
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-4">
                    No users found.
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
