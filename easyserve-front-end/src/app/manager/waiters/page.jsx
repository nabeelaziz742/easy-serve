"use client";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { UserPlus, Loader2, Pencil, Trash2, X } from "lucide-react";

export default function WaitersPage() {
  const token = useSelector((state) => state.auth.token);
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchWaiters = async () => {
    try {
      const res = await fetch("http://localhost:9000/api/user/staff/?type=waiter", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWaiters(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchWaiters();
  }, [token]);

  const openEdit = (waiter) => {
    setEditingUser(waiter);
    setEditForm({
      first_name: waiter.first_name || "",
      last_name: waiter.last_name || "",
      phone: waiter.phone || "",
      is_active: waiter.is_active,
    });
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({ ...editForm, [name]: type === "checkbox" ? checked : value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:9000/api/user/staff/${editingUser.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingUser(null);
        fetchWaiters();
      } else {
        const data = await res.json();
        alert(JSON.stringify(data));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this waiter?")) return;
    try {
      const res = await fetch(`http://localhost:9000/api/user/staff/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        fetchWaiters();
      } else {
        alert("Failed to delete");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-zinc-900">Waiters</h1>
          <p className="text-zinc-500 mt-1">Manage your restaurant waiters</p>
        </div>
        <Link
          href="/manager/waiters/add"
          className="flex items-center gap-2 bg-green-950 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-900 transition"
        >
          <UserPlus size={18} />
          Add Waiter
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-zinc-400" size={28} />
        </div>
      ) : waiters.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 text-center text-zinc-400">
          No waiters added yet.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-zinc-600">Name</th>
                <th className="px-6 py-3 text-sm font-semibold text-zinc-600">Username</th>
                <th className="px-6 py-3 text-sm font-semibold text-zinc-600">Email</th>
                <th className="px-6 py-3 text-sm font-semibold text-zinc-600">Phone</th>
                <th className="px-6 py-3 text-sm font-semibold text-zinc-600">Status</th>
                <th className="px-6 py-3 text-sm font-semibold text-zinc-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {waiters.map((w) => (
                <tr key={w.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-6 py-4 font-medium text-zinc-800">
                    {w.first_name || w.last_name ? `${w.first_name} ${w.last_name}`.trim() : "-"}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">{w.username}</td>
                  <td className="px-6 py-4 text-zinc-500">{w.email}</td>
                  <td className="px-6 py-4 text-zinc-500">{w.phone || "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      w.is_active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                    }`}>
                      {w.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(w)}
                        className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-green-700 transition"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-zinc-500 hover:text-red-600 transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Edit Waiter</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={editForm.first_name}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={editForm.last_name}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={editForm.is_active}
                  onChange={handleEditChange}
                  className="h-4 w-4"
                />
                <label htmlFor="is_active" className="text-sm font-semibold text-zinc-700">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-green-950 text-white py-2.5 rounded-xl font-semibold hover:bg-green-900 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-zinc-100 text-zinc-700 py-2.5 rounded-xl font-semibold hover:bg-zinc-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}