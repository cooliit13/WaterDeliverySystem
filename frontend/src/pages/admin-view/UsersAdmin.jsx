// src/pages/admin-view/UsersAdmin.jsx
import { useEffect, useState } from "react";
import { Edit2 } from "lucide-react";
import { apiFetch } from "@/utils/apiFetch";

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
      const data = await apiFetch("/api/admin/users");
      const list = Array.isArray(data) ? data : data?.users || [];
      setUsers(list);
    } catch (err) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }

  // FIXED — now supports fullName
  function resolveName(user) {
    if (!user) return "No name";

    // 1) fullName field from MongoDB
    if (user.fullName && user.fullName.trim() !== "") {
      return user.fullName.trim();
    }

    // 2) firstname + lastname
    const first = user.firstname?.trim() || "";
    const last = user.lastname?.trim() || "";
    const full = `${first} ${last}`.trim();
    if (full) return full;

    // 3) name
    if (user.name && user.name.trim() !== "") {
      return user.name.trim();
    }

    // 4) username
    if (user.username && user.username.trim() !== "") {
      return user.username.trim();
    }

    // 5) email
    if (user.email && user.email.trim() !== "") {
      return user.email.trim();
    }

    return "No name";
  }

  function startEditing(user) {
    const id = user?.id || user?._id;
    setEditingUserId(id);
    setNewRole(user?.role || "user");
  }

  async function saveRole(userId) {
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });

      setUsers(prev =>
        prev.map(u => {
          const uid = u?.id || u?._id;
          return uid === userId ? { ...u, role: newRole } : u;
        })
      );

      setEditingUserId(null);
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
